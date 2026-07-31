import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  mpGetSubscription,
  mpGetPayment,
  mpGetAuthorizedPayment,
  mpUpdateSubscriptionAmount,
  periodEndFromLastCharge,
  type MpSubscription,
} from "@/lib/mercadopago";
import { sendMetaPurchase } from "@/lib/meta-capi";
import { recordFunnelEventForUser } from "@/lib/api/funnel";
import { PRO_PRICE_ARS as FULL_MONTHLY_PRICE, PRO_PRICE_DISCOUNTED, planKindFromAmount } from "@/lib/pricing";

// Descuento primer-mes: la sub nace a PRO_PRICE_DISCOUNTED. Tras el primer cobro
// subimos el monto al precio normal para que el 2º mes en adelante salga full.
// Idempotente: una vez subido ya no coincide con el monto descontado.
async function bumpDiscountedAmountIfNeeded(sub: MpSubscription) {
  const current = sub.auto_recurring?.transaction_amount;
  if (current === PRO_PRICE_DISCOUNTED) {
    try {
      await mpUpdateSubscriptionAmount(sub.id, FULL_MONTHLY_PRICE);
      console.log(`[webhook] descuento primer-mes agotado: sub ${sub.id} $${PRO_PRICE_DISCOUNTED} → $${FULL_MONTHLY_PRICE}`);
    } catch (e) {
      console.error(`[webhook] no se pudo subir el monto de la sub ${sub.id}:`, e);
    }
  }
}

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

const PRO_FULL_CREDITS = 500;
const PRO_PRICE_ARS = 15900;
const SEMANAL_PRICE_ARS = 4900;
const TRIMESTRAL_PRICE_ARS = 34900;
const SEMANAL_DAYS = 7;
const TRIMESTRAL_DAYS = 90;

function looksLikeClerkId(s: string | null | undefined): s is string {
  return typeof s === "string" && s.startsWith("user_");
}

type Sb = ReturnType<typeof supabaseAdmin>;

type MatchedUser = {
  id: string;
  email: string;
  plan: "free" | "pro" | "semanal" | "trimestral";
  credits: number;
  referred_by: string | null;
  mp_subscription_id: string | null;
  expires_at: string | null;
};

const USER_COLS = "id, email, plan, credits, referred_by, mp_subscription_id, expires_at";

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
  // Registro diferido: el external_reference de una sesión anónima es su
  // anon_session_id (UUID, sin prefijo user_). Activa el plan sobre esa fila; la
  // cuenta Clerk se crea al confirmar el mail en /pago-exitoso.
  if (opts.externalRef && !looksLikeClerkId(opts.externalRef)) {
    const { data } = await sb
      .from("users")
      .select(USER_COLS)
      .eq("anon_session_id", opts.externalRef)
      .maybeSingle();
    if (data) return { user: data as MatchedUser, matchedBy: "anon_session_id" };
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

function isSemanalPlan(preapprovalPlanId: string | undefined): boolean {
  const id = process.env.MP_PLAN_ID_SEMANAL;
  return !!id && preapprovalPlanId === id;
}

function isTrimestralPlan(preapprovalPlanId: string | undefined): boolean {
  const id = process.env.MP_PLAN_ID_TRIMESTRAL;
  return !!id && preapprovalPlanId === id;
}

// Detecta el plan por el preapproval_plan_id (Checkout Pro) y, si la sub no
// tiene plan_id (Checkout EMBEBIDO, monto directo), por el MONTO.
function detectPlanType(
  preapprovalPlanId: string | undefined,
  amount?: number | null,
): "pro" | "semanal" | "trimestral" {
  if (isSemanalPlan(preapprovalPlanId)) return "semanal";
  if (isTrimestralPlan(preapprovalPlanId)) return "trimestral";
  return planKindFromAmount(amount) ?? "pro";
}

// Determina el plan por el MONTO cobrado (para pagos sueltos sin preapproval_id).
function planTypeFromAmount(
  amount: number,
  current?: string,
): "pro" | "semanal" | "trimestral" {
  if (amount === SEMANAL_PRICE_ARS) return "semanal";
  if (amount === TRIMESTRAL_PRICE_ARS) return "trimestral";
  if (amount === PRO_PRICE_ARS) return "pro";
  // Monto desconocido: respetar el plan pago actual si lo hay, sino pro.
  if (current === "semanal" || current === "trimestral") return current;
  return "pro";
}

// Activa o renueva un plan pagado (pro, semanal o trimestral). Idempotente.
async function activateOrRenewPlan(
  sb: Sb,
  user: MatchedUser,
  opts: { subscriptionId?: string | null; planType: "pro" | "semanal" | "trimestral" },
) {
  const { data: pendingReferral } = await sb
    .from("referrals")
    .select("id, referrer_id")
    .eq("referred_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const isFirstPayment = !!pendingReferral;
  const referralBonus = isFirstPayment ? 50 : 0;

  const patch: Record<string, unknown> = {
    plan: opts.planType,
    updated_at: new Date().toISOString(),
  };

  if (opts.planType === "semanal") {
    patch.credits = 0;
    patch.expires_at = new Date(Date.now() + SEMANAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  } else if (opts.planType === "trimestral") {
    patch.credits = PRO_FULL_CREDITS + referralBonus;
    patch.expires_at = new Date(Date.now() + TRIMESTRAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  } else {
    patch.credits = PRO_FULL_CREDITS + referralBonus;
    patch.expires_at = null;
  }

  if (opts.subscriptionId && !user.mp_subscription_id) {
    patch.mp_subscription_id = opts.subscriptionId;
  }

  const { error } = await sb.from("users").update(patch).eq("id", user.id);
  if (error) {
    console.error(`[webhook] activateOrRenewPlan falló (user=${user.id}, plan=${opts.planType}):`, error);
    return;
  }

  console.log(
    `[webhook] ${user.email} → ${opts.planType} (era ${user.plan}, sub=${opts.subscriptionId ?? user.mp_subscription_id ?? "-"})`,
  );

  // Funnel: pago confirmado (cobro inicial o renovación)
  await recordFunnelEventForUser(user.id, "pago_confirmado", opts.planType);

  if (isFirstPayment && pendingReferral) {
    await sb
      .from("referrals")
      .update({ status: "converted", converted_at: new Date().toISOString() })
      .eq("id", pendingReferral.id);
    await processReferrerReward(sb, pendingReferral.referrer_id);
  }
}

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
// ─────────────────────────────────────────────────────────────────────────────
async function handlePreapproval(subscriptionId: string) {
  const subscription = await mpGetSubscription(subscriptionId);
  const sb = supabaseAdmin();
  const lookup = {
    preapprovalId: subscription.id,
    externalRef: subscription.external_reference,
    payerEmail: subscription.payer_email,
  };
  const planType = detectPlanType(subscription.preapproval_plan_id, subscription.auto_recurring?.transaction_amount);

  if (subscription.status === "authorized") {
    const { user, matchedBy } = await findUser(sb, lookup);
    if (!user) {
      console.warn(
        `[webhook/preapproval] SIN MATCH (authorized) sub=${subscription.id} ext_ref=${subscription.external_reference} email="${subscription.payer_email}"`,
      );
      return;
    }
    if (user.plan === "free") {
      await activateOrRenewPlan(sb, user, { subscriptionId: subscription.id, planType });
      console.log(`[webhook/preapproval] ${user.email} → ${planType} (matchedBy=${matchedBy})`);
    } else if (!user.mp_subscription_id) {
      await sb
        .from("users")
        .update({ mp_subscription_id: subscription.id })
        .eq("id", user.id);
    }
    // OJO: NO subir el monto acá. MP cobra el 1er pago DIFERIDO (no al crear la
    // sub); si subimos el monto en el alta, el 1er cobro sale full. El bump del
    // descuento va SOLO tras el primer cobro real (handleAuthorizedPayment /
    // handlePayment).
  } else if (subscription.status === "cancelled" || subscription.status === "paused") {
    const { user, matchedBy } = await findUser(sb, lookup);
    if (!user) {
      console.warn(
        `[webhook/preapproval] SIN MATCH (${subscription.status}) sub=${subscription.id}`,
      );
      return;
    }
    // No corta el acceso en el momento: MercadoPago dejó de cobrar, pero el
    // usuario ya pagó ese período — sigue con el plan hasta que venza.
    const patch: Record<string, unknown> = { mp_subscription_id: null, updated_at: new Date().toISOString() };
    if (user.plan === "pro") {
      patch.expires_at = periodEndFromLastCharge(subscription, planType) ?? user.expires_at;
    }
    // semanal/trimestral ya tienen expires_at correcto de su última renovación: no se toca.
    await sb.from("users").update(patch).eq("id", user.id);
    await recordFunnelEventForUser(user.id, "plan_cancelado_mp", subscription.status);
    console.log(`[webhook/preapproval] ${user.email} plan=${user.plan} vence=${patch.expires_at ?? user.expires_at ?? "-"} (${subscription.status}, matchedBy=${matchedBy})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION_AUTHORIZED_PAYMENT: cobro recurrente (renovación).
// Pro: renueva 500 créditos. Semanal: extiende expires_at +7d.
// ─────────────────────────────────────────────────────────────────────────────
async function handleAuthorizedPayment(authPaymentId: string) {
  const ap = await mpGetAuthorizedPayment(authPaymentId);
  const paid = ap.status === "processed" || ap.payment?.status === "approved";
  if (!paid) {
    console.log(`[webhook/authpay] ${authPaymentId} no aprobado (status=${ap.status})`);
    return;
  }
  const sb = supabaseAdmin();

  // Traemos la suscripción ANTES de buscar el usuario: además de servir para
  // detectar el tipo de plan, da external_reference/payer_email como fallback
  // de matching. El primer ciclo de una suscripción a veces llega sin que
  // mp_subscription_id haya quedado guardado en la fila del usuario (el
  // webhook "payment" inicial suele traer preapproval_id null) — sin este
  // fallback la renovación se pierde en silencio aunque MP sí cobró.
  let subscription: MpSubscription | null = null;
  if (ap.preapproval_id) {
    try {
      subscription = await mpGetSubscription(ap.preapproval_id);
    } catch (e) {
      console.error(`[webhook/authpay] mpGetSubscription falló para ${ap.preapproval_id}:`, e);
    }
  }

  const { user, matchedBy } = await findUser(sb, {
    preapprovalId: ap.preapproval_id,
    externalRef: subscription?.external_reference,
    payerEmail: subscription?.payer_email,
  });
  if (!user) {
    console.warn(`[webhook/authpay] SIN MATCH preapproval=${ap.preapproval_id}`);
    return;
  }

  const planType: "pro" | "semanal" | "trimestral" = subscription
    ? detectPlanType(subscription.preapproval_plan_id, subscription.auto_recurring?.transaction_amount ?? ap.transaction_amount)
    : (user.plan === "semanal" || user.plan === "trimestral") ? user.plan : "pro";

  await activateOrRenewPlan(sb, user, { subscriptionId: ap.preapproval_id, planType });
  console.log(`[webhook/authpay] ${user.email} ${planType} renovado (matchedBy=${matchedBy})`);

  // Descuento primer-mes: tras el 1er cobro, subir el monto al precio normal.
  if (subscription) await bumpDiscountedAmountIfNeeded(subscription);

  const amount = ap.transaction_amount ?? (
    planType === "semanal" ? SEMANAL_PRICE_ARS :
    planType === "trimestral" ? TRIMESTRAL_PRICE_ARS :
    PRO_PRICE_ARS
  );
  await recordPayment(sb, {
    user,
    mpId: `authpay_${authPaymentId}`,
    kind: "authorized_payment",
    amount,
  });

  await sendMetaPurchase({
    email: user.email,
    value: amount,
    currency: "ARS",
    eventId: `purchase_${authPaymentId}`,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT: pago suelto (compatibilidad).
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
      `[webhook/payment] SIN MATCH payment=${paymentId} preapproval=${payment.preapproval_id}`,
    );
    return;
  }

  // El plan se determina por el plan de la suscripción si el pago la referencia;
  // si no (regular_payment sin preapproval_id), por el MONTO real del pago. NUNCA
  // asumir "pro" a ciegas: eso daba PRO ilimitado a quien pagaba semanal.
  const amount = payment.transaction_amount ?? 0;
  let planType: "pro" | "semanal" | "trimestral";
  if (payment.preapproval_id) {
    try {
      const sub = await mpGetSubscription(payment.preapproval_id);
      planType = detectPlanType(sub.preapproval_plan_id, sub.auto_recurring?.transaction_amount ?? amount);
      // Descuento primer-mes: subir el monto tras el 1er cobro.
      await bumpDiscountedAmountIfNeeded(sub);
    } catch {
      planType = planTypeFromAmount(amount, user.plan);
    }
  } else {
    planType = planTypeFromAmount(amount, user.plan);
  }

  await activateOrRenewPlan(sb, user, { subscriptionId: payment.preapproval_id, planType });
  console.log(`[webhook/payment] ${user.email} ${planType} $${amount} (matchedBy=${matchedBy})`);

  // Monto real cobrado; si MP no lo trae, caemos al precio de lista del plan.
  const payAmount = amount > 0 ? amount :
    planType === "semanal" ? SEMANAL_PRICE_ARS :
    planType === "trimestral" ? TRIMESTRAL_PRICE_ARS :
    PRO_PRICE_ARS;

  await recordPayment(sb, {
    user,
    mpId: `pay_${paymentId}`,
    kind: "payment",
    amount: payAmount,
  });

  await sendMetaPurchase({
    email: user.email,
    value: payAmount,
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
      console.warn(`[webhooks/mercadopago] firma no coincide (type=${type}, id=${dataId}) — proceso igual`);
      Sentry.captureMessage("mp_webhook_signature_mismatch", {
        level: "warning",
        extra: { type, dataId },
      });
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
