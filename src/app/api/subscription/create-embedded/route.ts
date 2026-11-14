import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpCreateSubscriptionWithToken } from "@/lib/mercadopago";
import { getOrCreateAnonUser } from "@/lib/anon";
import { ensureAccountForPaidAnon } from "@/lib/claim";
import { isDisposableEmail } from "@/lib/anti-fraude";
import { recordFunnelEvent, recordFunnelEventForUser } from "@/lib/api/funnel";
import { sendProWelcomeEmail } from "@/lib/email/resend";
import { PLANS, PRO_PRICE_DISCOUNTED, isValidDiscountCode, type PlanKind } from "@/lib/pricing";
import { getAppOrigin, metaBrowserContext } from "@/lib/checkout";
import { isPaidPlan } from "@/lib/ai/claude";

const ANON_COOKIE = "skillio_anon";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAY = 24 * 60 * 60 * 1000;

// Checkout EMBEBIDO (Bricks) del plan MENSUAL (suscripción). El Pase de
// cuatrimestre (pago único) va por /api/checkout/pase. El front tokeniza la tarjeta en
// el navegador y nos manda el card_token; acá creamos la suscripción con
// status:"authorized" (MP cobra el primer pago al toque, sin redirigir) y
// activamos el plan en el mismo request. La tarjeta NUNCA toca nuestro server.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardToken = typeof body.card_token === "string" ? body.card_token : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = (typeof body.phone === "string" ? body.phone : "").replace(/[^\d+]/g, "").slice(0, 20);
    // Solo se vende el Mensual por suscripción (Semanal/Trimestral retirados).
    if (body.plan && body.plan !== "pro") return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
    const planKind: PlanKind = "pro";
    const spec = PLANS[planKind];

    // Código de descuento (SKILLIO25): SOLO plan pro y SOLO primer mes. El
    // monto del 1er cobro baja y el webhook lo sube al normal tras ese pago.
    const applyDiscount = planKind === "pro" && isValidDiscountCode(body.promo);
    const amount = applyDiscount ? PRO_PRICE_DISCOUNTED : spec.amount;
    const expiresAt = spec.expiresDays == null ? null : new Date(Date.now() + spec.expiresDays * DAY).toISOString();

    if (!cardToken) return NextResponse.json({ error: "missing_card_token" }, { status: 400 });
    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });

    const { userId } = await auth();
    const sb = supabaseAdmin();

    // Identidad + external_reference (lo que el webhook usa para matchear):
    // clerk userId (con cuenta) o anon_session_id (registro diferido).
    let externalRef: string;
    let currentPlan: string;
    let currentExpires: string | null = null;
    let anonRowId: string | null = null;

    if (userId) {
      const { data: user } = await sb.from("users").select("id, plan, expires_at").eq("clerk_user_id", userId).maybeSingle();
      if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      externalRef = userId;
      currentPlan = user.plan;
      currentExpires = user.expires_at;
    } else {
      const anon = await getOrCreateAnonUser();
      const session = (await cookies()).get(ANON_COOKIE)?.value ?? "";
      if (!session) return NextResponse.json({ error: "no_session" }, { status: 400 });
      externalRef = session;
      currentPlan = anon.plan;
      anonRowId = anon.id;
    }

    // Plan pago VIGENTE → no dejamos suscribirse de nuevo. Un plan vencido
    // (ej. canceló el Mensual y ya pasó la fecha) sí puede volver a comprar.
    if (isPaidPlan(currentPlan, currentExpires))
      return NextResponse.json({ error: "already_subscribed" }, { status: 400 });

    // OJO: MP valida el back_url de forma ultra-estricta y RECHAZA cualquier
    // path o barra final; solo el dominio pelado pasa. Con el embebido el
    // back_url no se usa para redirigir igual.
    const backUrl = getAppOrigin();

    let subscription;
    try {
      subscription = await mpCreateSubscriptionWithToken({
        reason: `Plan ${spec.label} Skillio`,
        externalRef,
        payerEmail: email,
        cardTokenId: cardToken,
        amount,
        frequency: spec.frequency,
        frequencyType: spec.frequencyType,
        backUrl,
      });
    } catch (e) {
      // El motivo real de MP queda en el log/Sentry (no se expone al cliente).
      const raw = e instanceof Error ? e.message : String(e);
      console.error("[create-embedded] MP rechazó la suscripción:", raw);
      Sentry.captureException(e, { tags: { step: "create-embedded:mp" } });
      return NextResponse.json({ error: "card_declined" }, { status: 402 });
    }

    // Funnel: llegó al checkout (y lo pagó, a confirmar por status).
    const funnelStep = applyDiscount ? "pro_skillio25" : "pro";
    if (userId) await recordFunnelEvent("checkout_iniciado", funnelStep);
    else if (anonRowId) await recordFunnelEventForUser(anonRowId, "checkout_iniciado", funnelStep);

    // Cookies de Meta: el Purchase del Mensual sale del webhook (sin navegador)
    // cuando MP cobra de verdad; guardarlas acá mejora el match.
    const ctx = await metaBrowserContext();
    const metaCols = { ...(ctx.fbp ? { meta_fbp: ctx.fbp } : {}), ...(ctx.fbc ? { meta_fbc: ctx.fbc } : {}) };

    // MP no autorizó al instante (raro con card_token; ej. requiere revisión).
    // La sub queda creada: el webhook la activará cuando pase a authorized.
    if (subscription.status !== "authorized") {
      return NextResponse.json({ ok: true, pending: true, plan: planKind });
    }

    // ── Activación inmediata (no dependemos del webhook) ──
    if (userId) {
      const { data: user } = await sb.from("users").select("id, plan, expires_at").eq("clerk_user_id", userId).maybeSingle();
      if (user && !isPaidPlan(user.plan, user.expires_at)) {
        await sb
          .from("users")
          .update({
            plan: planKind,
            credits: spec.credits,
            expires_at: expiresAt,
            mp_subscription_id: subscription.id,
            ...(phone ? { phone } : {}),
            ...metaCols,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
        await sendProWelcomeEmail(email, planKind);
      }
      return NextResponse.json({ ok: true, plan: planKind });
    }

    // Anónimo: crear (o reutilizar) la cuenta, activar el plan y devolver un
    // sign-in token para el auto-login. El plan va explícito (la sub embebida
    // no tiene preapproval_plan_id).
    const { clerkUserId, plan } = await ensureAccountForPaidAnon({
      anonRowId: anonRowId!,
      email,
      subscription,
      planKind,
    });

    // Guardar el teléfono en la fila ya reclamada (evita el gate de
    // /completar-telefono tras el pago).
    await sb.from("users").update({ ...(phone ? { phone } : {}), ...metaCols }).eq("clerk_user_id", clerkUserId);

    await sendProWelcomeEmail(email, planKind);

    const client = await clerkClient();
    const token = await client.signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 60 * 10,
    });

    return NextResponse.json({ ok: true, plan, token: token.token });
  } catch (e) {
    console.error("[api/subscription/create-embedded]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
