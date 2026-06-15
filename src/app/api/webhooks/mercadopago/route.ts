import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  mpGetSubscription,
  mpGetPayment,
  mpGetAuthorizedPayment,
} from "@/lib/mercadopago";
import { sendMetaPurchase } from "@/lib/meta-capi";

function verifySignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return expected === v1;
}

// Plan único: cualquier suscripción activa es PRO.
const PRO_FULL_CREDITS = 500;
// Precio del plan PRO (ARS) — el valor que reportamos a Meta como compra.
const PRO_PRICE_ARS = 16000;

// Los external_reference que setea nuestra app son IDs de Clerk (user_...).
// MP a veces trae basura en ese campo (ej "PLANBASICO", el default del plan),
// así que solo confiamos en él si tiene la forma de un Clerk ID.
function looksLikeClerkId(s: string | null | undefined): s is string {
  return typeof s === "string" && s.startsWith("user_");
}

type Sb = ReturnType<typeof supabaseAdmin>;

type MatchedUser = {
  id: string;
  email: string;
  plan: "free" | "pro";
  credits: number;
  referred_by: string | null;
  mp_subscription_id: string | null;
};

const USER_COLS = "id, email, plan, credits, referred_by, mp_subscription_id";

// Búsqueda robusta del usuario, por orden de confiabilidad:
//   1) mp_subscription_id (lo guarda /pago-exitoso al activar — el más fiable)
//   2) external_reference, solo si parece un Clerk ID
//   3) payer_email
async function findUser(
  sb: Sb,
  opts: { preapprovalId?: string | null; externalRef?: string | null; payerEmail?: string | null },
): Promise<{ user: MatchedUser | null; matchedBy: string | null }> {
  if (opts.preapprovalId) {
    const { data } = await sb
      .from("users")
      .select(USER_COLS)
      .eq("mp_subscription_id", opts.preapprovalId)
      .maybeSingle();
    if (data) return { user: data as MatchedUser, matchedBy: "mp_subscription_id" };
  }
  if (looksLikeClerkId(opts.externalRef)) {
    const { data } = await sb
      .from("users")
      .select(USER_COLS)
      .eq("clerk_user_id", opts.externalRef)
      .maybeSingle();
    if (data) return { user: data as MatchedUser, matchedBy: "external_reference" };
  }
  if (opts.payerEmail) {
    const { data } = await sb
      .from("users")
      .select(USER_COLS)
      .eq("email", opts.payerEmail)
      .maybeSingle();
    if (data) return { user: data as MatchedUser, matchedBy: "email" };
  }
  return { user: null, matchedBy: null };
}

// Otorga los créditos completos del plan (post-trial / renovación) y procesa
// el referido si es el primer pago. Idempotente: SETEA créditos, no acumula.
async function grantFullCredits(sb: Sb, user: MatchedUser) {
  if (user.plan === "free") {
    console.warn(`[webhook] grantFullCredits: ${user.email} está en free, no se otorgan créditos`);
    return;
  }

  const { data: pendingReferral } = await sb
    .from("referrals")
    .select("id, referrer_id")
    .eq("referred_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const isFirstPayment = !!pendingReferral;
  const referralBonus = isFirstPayment ? 50 : 0;
  const credits = PRO_FULL_CREDITS + referralBonus;

  const { error } = await sb
    .from("users")
    .update({ credits, updated_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    console.error(`[webhook] grantFullCredits update FALLÓ (user=${user.id}):`, error);
    return;
  }

  console.log(
    `[webhook] ${user.email} → ${credits} créditos (plan=${user.plan}, referralBonus=${referralBonus})`,
  );

  if (isFirstPayment && pendingReferral) {
    await sb
      .from("referrals")
      .update({ status: "converted", converted_at: new Date().toISOString() })
      .eq("id", pendingReferral.id);
    await processReferrerReward(sb, pendingReferral.referrer_id);
  }
}

// Registra el cobro en el ledger de pagos (para el panel /admin). Idempotente:
// onConflict mp_id evita duplicar ante reintentos del webhook.
async function recordPayment(
  sb: Sb,
  opts: { user: MatchedUser; mpId: string; kind: string; amount?: number | null },
) {
  const { error } = await sb.from("payments").upsert(
    {
      user_id: opts.user.id,
      mp_id: opts.mpId,
      kind: opts.kind,
      amount: opts.amount ?? PRO_PRICE_ARS,
      currency: "ARS",
      status: "approved",
      email: opts.user.email,
    },
    { onConflict: "mp_id" },
  );
  if (error) console.error("[webhook] recordPayment error:", error);
}

// Recompensa al referrer: 150 créditos cada 2 referidos convertidos.
async function processReferrerReward(sb: Sb, referrerId: string) {
  const { count } = await sb
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "converted");

  const converted = count ?? 0;
  if (converted > 0 && converted % 2 === 0) {
    const { data: referrer } = await sb
      .from("users")
      .select("credits")
      .eq("id", referrerId)
      .maybeSingle();
    if (!referrer) return;
    await sb
      .from("users")
      .update({ credits: (referrer.credits ?? 0) + 150 })
      .eq("id", referrerId);
    console.log(`[webhook] referrer ${referrerId} +150 créditos (${converted} referidos)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PREAPPROVAL: alta / baja de la suscripción.
// "authorized" → activar PRO con 500 créditos (sin free_trial: acceso completo ya).
//   En la práctica /pago-exitoso ya activa al volver el usuario; esto es respaldo.
// "cancelled" / "paused" → bajar a free.
// ─────────────────────────────────────────────────────────────────────────────
async function handlePreapproval(subscriptionId: string) {
  const subscription = await mpGetSubscription(subscriptionId);
  const sb = supabaseAdmin();
  const lookup = {
    preapprovalId: subscription.id,
    externalRef: subscription.external_reference,
    payerEmail: subscription.payer_email,
  };

  if (subscription.status === "authorized") {
    const plan = "pro" as const;
    const { user, matchedBy } = await findUser(sb, lookup);
    if (!user) {
      console.warn(
        `[webhook/preapproval] SIN MATCH (authorized) sub=${subscription.id} ext_ref=${subscription.external_reference} email="${subscription.payer_email}" — se activará vía /pago-exitoso`,
      );
      return;
    }
    if (user.plan === "free") {
      const { error } = await sb
        .from("users")
        .update({
          plan,
          mp_subscription_id: subscription.id,
          credits: PRO_FULL_CREDITS,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (error) {
        console.error(`[webhook/preapproval] update FALLÓ (user=${user.id}, plan=${plan}):`, error);
        return;
      }
      console.log(`[webhook/preapproval] ${user.email} activado plan=${plan} (matchedBy=${matchedBy})`);
    } else if (!user.mp_subscription_id) {
      // Ya estaba activo pero sin id guardado: lo persistimos para renovaciones.
      await sb
        .from("users")
        .update({ mp_subscription_id: subscription.id })
        .eq("id", user.id);
    }
  } else if (subscription.status === "cancelled" || subscription.status === "paused") {
    const { user, matchedBy } = await findUser(sb, lookup);
    if (!user) {
      console.warn(
        `[webhook/preapproval] SIN MATCH (${subscription.status}) sub=${subscription.id} — no se pudo bajar a free`,
      );
      return;
    }
    await sb
      .from("users")
      .update({
        plan: "free",
        mp_subscription_id: null,
        credits: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    console.log(`[webhook/preapproval] ${user.email} → free (${subscription.status}, matchedBy=${matchedBy})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION_AUTHORIZED_PAYMENT: cobro recurrente de la suscripción
// (primer cobro tras el trial de 24h y renovaciones mensuales).
// Es ACÁ donde el usuario PRO recibe sus 500 créditos completos.
// ─────────────────────────────────────────────────────────────────────────────
async function handleAuthorizedPayment(authPaymentId: string) {
  const ap = await mpGetAuthorizedPayment(authPaymentId);
  const paid = ap.status === "processed" || ap.payment?.status === "approved";
  if (!paid) {
    console.log(`[webhook/authpay] ${authPaymentId} aún no aprobado (status=${ap.status}, payment=${ap.payment?.status ?? "-"})`);
    return;
  }
  const sb = supabaseAdmin();
  const { user, matchedBy } = await findUser(sb, { preapprovalId: ap.preapproval_id });
  if (!user) {
    console.warn(`[webhook/authpay] SIN MATCH preapproval=${ap.preapproval_id} (authPayment=${authPaymentId})`);
    return;
  }
  if (user.plan === "free") {
    console.warn(`[webhook/authpay] ${user.email} en free pero llegó cobro — revisar activación`);
    return;
  }
  await grantFullCredits(sb, user);
  console.log(`[webhook/authpay] ${user.email} créditos completos otorgados (matchedBy=${matchedBy})`);

  await recordPayment(sb, {
    user,
    mpId: `authpay_${authPaymentId}`,
    kind: "authorized_payment",
    amount: ap.transaction_amount ?? PRO_PRICE_ARS,
  });

  // CAPI: este es el cobro real (post-trial / renovación) → Purchase a Meta.
  await sendMetaPurchase({
    email: user.email,
    value: PRO_PRICE_ARS,
    currency: "ARS",
    eventId: `purchase_${authPaymentId}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT: pago suelto (no recurrente). Lo dejamos por compatibilidad.
// ─────────────────────────────────────────────────────────────────────────────
async function handlePayment(paymentId: string) {
  const payment = await mpGetPayment(paymentId);
  if (payment.status !== "approved") return;

  const sb = supabaseAdmin();
  const { user, matchedBy } = await findUser(sb, {
    preapprovalId: payment.preapproval_id,
    externalRef: payment.external_reference,
    payerEmail: payment.payer?.email,
  });
  if (!user) {
    console.warn(
      `[webhook/payment] SIN MATCH payment=${paymentId} preapproval=${payment.preapproval_id} email="${payment.payer?.email}"`,
    );
    return;
  }
  if (user.plan === "free") return;
  await grantFullCredits(sb, user);
  console.log(`[webhook/payment] ${user.email} créditos completos (matchedBy=${matchedBy})`);

  await recordPayment(sb, {
    user,
    mpId: `pay_${paymentId}`,
    kind: "payment",
    amount: PRO_PRICE_ARS,
  });

  // CAPI: pago suelto aprobado → Purchase a Meta.
  await sendMetaPurchase({
    email: user.email,
    value: PRO_PRICE_ARS,
    currency: "ARS",
    eventId: `purchase_${paymentId}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataId = String(body.data?.id ?? "");
    const type = String(body.type ?? body.action ?? "");

    if (!dataId) return NextResponse.json({ ok: true });

    if (!verifySignature(req, dataId)) {
      console.warn(`[webhooks/mercadopago] firma inválida (type=${type}, id=${dataId})`);
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    if (type === "preapproval" || type === "subscription_preapproval") {
      await handlePreapproval(dataId);
    } else if (type === "subscription_authorized_payment") {
      await handleAuthorizedPayment(dataId);
    } else if (type === "payment") {
      await handlePayment(dataId);
    } else {
      console.log(`[webhooks/mercadopago] tipo no manejado: ${type} (id=${dataId})`);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhooks/mercadopago]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
