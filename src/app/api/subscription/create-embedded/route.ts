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

const ANON_COOKIE = "skillio_anon";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PRO_PRICE_ARS = 15900;
const PRO_CREDITS = 500;

// Checkout EMBEBIDO (Bricks). El front tokeniza la tarjeta en el navegador y nos
// manda el card_token; acá creamos la suscripción con status:"authorized" (MP
// cobra el primer pago al toque, sin redirigir) y activamos el plan en el mismo
// request. Solo plan Mensual (pro) por ahora — semanal/trimestral siguen con
// Checkout Pro. La tarjeta NUNCA toca nuestro server (solo el token de un uso).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardToken = typeof body.card_token === "string" ? body.card_token : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!cardToken) return NextResponse.json({ error: "missing_card_token" }, { status: 400 });
    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });

    const { userId } = await auth();
    const sb = supabaseAdmin();

    // Identidad + external_reference (lo que el webhook usa para matchear):
    // clerk userId (con cuenta) o anon_session_id (registro diferido).
    let externalRef: string;
    let currentPlan: string;
    let anonRowId: string | null = null;

    if (userId) {
      const { data: user } = await sb
        .from("users")
        .select("id, plan")
        .eq("clerk_user_id", userId)
        .maybeSingle();
      if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      externalRef = userId;
      currentPlan = user.plan;
    } else {
      const anon = await getOrCreateAnonUser();
      const session = (await cookies()).get(ANON_COOKIE)?.value ?? "";
      if (!session) return NextResponse.json({ error: "no_session" }, { status: 400 });
      externalRef = session;
      currentPlan = anon.plan;
      anonRowId = anon.id;
    }

    if (currentPlan !== "free")
      return NextResponse.json({ error: "already_subscribed" }, { status: 400 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://skillio.digital";

    // Crear la suscripción con la tarjeta tokenizada. Si la tarjeta se rechaza,
    // MP tira error acá → lo devolvemos como card_declined para que el front
    // pida otra tarjeta.
    let subscription;
    try {
      subscription = await mpCreateSubscriptionWithToken({
        reason: "Plan Mensual Skillio",
        externalRef,
        payerEmail: email,
        cardTokenId: cardToken,
        amount: PRO_PRICE_ARS,
        backUrl: `${appUrl}/app?upgraded=1`,
      });
    } catch (e) {
      // El error de mpFetch trae el body crudo de MP (con el motivo real del
      // rechazo). Lo devolvemos como `detail` TEMPORALMENTE para diagnosticar
      // el flujo real de pago — hay que sacarlo cuando el checkout esté validado.
      const raw = e instanceof Error ? e.message : String(e);
      console.error("[create-embedded] MP rechazó la suscripción:", raw);
      Sentry.captureException(e, { tags: { step: "create-embedded:mp" } });
      return NextResponse.json({ error: "card_declined", detail: raw }, { status: 402 });
    }

    // Funnel: llegó al checkout (y lo pagó, a confirmar por status).
    if (userId) await recordFunnelEvent("checkout_iniciado", "pro");
    else if (anonRowId) await recordFunnelEventForUser(anonRowId, "checkout_iniciado", "pro");

    // MP no autorizó al instante (raro con card_token; ej. requiere revisión).
    // La sub queda creada: el webhook la activará cuando pase a authorized.
    if (subscription.status !== "authorized") {
      return NextResponse.json({ ok: true, pending: true, plan: "pro" });
    }

    // ── Activación inmediata (no dependemos del webhook) ──
    if (userId) {
      // Usuario con cuenta: activar sobre su fila.
      const { data: user } = await sb
        .from("users")
        .select("id, plan")
        .eq("clerk_user_id", userId)
        .maybeSingle();
      if (user && user.plan === "free") {
        await sb
          .from("users")
          .update({
            plan: "pro",
            credits: PRO_CREDITS,
            expires_at: null,
            mp_subscription_id: subscription.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
      return NextResponse.json({ ok: true, plan: "pro" });
    }

    // Anónimo: crear (o reutilizar) la cuenta, activar el plan y devolver un
    // sign-in token para el auto-login en el cliente. Reusa la misma lógica que
    // el claim del Checkout Pro (idempotente).
    const { clerkUserId, plan } = await ensureAccountForPaidAnon({
      anonRowId: anonRowId!,
      email,
      subscription,
    });

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
