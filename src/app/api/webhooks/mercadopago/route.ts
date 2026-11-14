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
import { activatePasePayment, isSkillioPasePayment } from "@/lib/pase";
import {
  DISCOUNT_CODE,
  PLANS,
  PRO_CREDITS,
  PRO_PRICE_ARS,
  PRO_PRICE_DISCOUNTED,
  isDiscountedMonthly,
  planKindFromAmount,
  productName,
  type PlanKind,
} from "@/lib/pricing";

// Planes que puede tener una SUSCRIPCIÓN (el Pase es pago único: va aparte).
type SubPlan = Exclude<PlanKind, "pase">;

// Descuento primer-mes: la sub nace a PRO_PRICE_DISCOUNTED. Tras el primer cobro
// subimos el monto al precio normal para que el 2º mes en adelante salga full.
// Idempotente: una vez subido ya no coincide con el monto descontado.
async function bumpDiscountedAmountIfNeeded(sub: MpSubscription) {
  const current = sub.auto_recurring?.transaction_amount;
  if (current === PRO_PRICE_DISCOUNTED) {
    try {
      await mpUpdateSubscriptionAmount(sub.id, PRO_PRICE_ARS);
      console.log(`[webhook] descuento primer-mes agotado: sub ${sub.id} $${PRO_PRICE_DISCOUNTED} → $${PRO_PRICE_ARS}`);
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

const DAY = 24 * 60 * 60 * 1000;

function looksLikeClerkId(s: string | null | undefined): s is string {
  return typeof s === "string" && s.startsWith("user_");
}

type Sb = ReturnType<typeof supabaseAdmin>;

type MatchedUser = {
  id: string;
  email: string;
  plan: "free" | PlanKind;
  credits: number;
  referred_by: string | null;
  mp_subscription_id: string | null;
  expires_at: string | null;
  clerk_user_id: string | null;
  phone: string | null;
  meta_fbp: string | null;
  meta_fbc: string | null;
};

const USER_COLS = "id, email, plan, credits, referred_by, mp_subscription_id, expires_at, clerk_user_id, phone, meta_fbp, meta_fbc";

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
  // anon_session_id. Solo activamos si la fila YA es una cuenta (clerk_user_id):
  // una fila anónima pura no debe quedar con plan pago (invariante de actor.ts).
  if (opts.externalRef && !looksLikeClerkId(opts.externalRef)) {
    const { data } = await sb
      .from("users")
      .select(USER_COLS)
      .eq("anon_session_id", opts.externalRef)
      .maybeSingle();
    if (data && data.clerk_user_id) return { user: data as MatchedUser, matchedBy: "anon_session_id" };
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

// Plan de una suscripción: por preapproval_plan_id (Checkout Pro viejo) o, si
// no tiene (checkout embebido, monto directo), por el MONTO.
function detectPlanType(preapprovalPlanId: string | undefined, amount?: number | null): SubPlan {
  if (preapprovalPlanId && preapprovalPlanId === process.env.MP_PLAN_ID_SEMANAL) return "semanal";
  if (preapprovalPlanId && preapprovalPlanId === process.env.MP_PLAN_ID_TRIMESTRAL) return "trimestral";
  const k = planKindFromAmount(amount);
  return k === "semanal" || k === "trimestral" ? k : "pro";
}

// Activa o renueva un plan de SUSCRIPCIÓN (pro; semanal/trimestral legacy). Idempotente.
async function activateOrRenewPlan(
  sb: Sb,
  user: MatchedUser,
  opts: { subscriptionId?: string | null; planType: SubPlan },
) {
  const { data: pendingReferral } = await sb
    .from("referrals")
    .select("id, referrer_id")
    .eq("referred_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const isFirstPayment = !!pendingReferral;
  const referralBonus = isFirstPayment ? 50 : 0;
  const spec = PLANS[opts.planType];

  const patch: Record<string, unknown> = {
    plan: opts.planType,
    credits: opts.planType === "semanal" ? 0 : PRO_CREDITS + referralBonus,
    expires_at: spec.expiresDays == null ? null : new Date(Date.now() + spec.expiresDays * DAY).toISOString(),
    updated_at: new Date().toISOString(),
  };

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

  await recordFunnelEventForUser(user.id, "pago_confirmado", opts.planType);

  if (isFirstPayment && pendingReferral) {
    await sb
      .from("referrals")
      .update({ status: "converted", converted_at: new Date().toISOString() })
      .eq("id", pendingReferral.id);
    await processReferrerReward(sb, pendingReferral.referrer_id);
  }
}

/**
 * Registra un COBRO de suscripción y, si es el PRIMERO de esa suscripción,
 * avisa la compra a Meta. MP avisa el mismo cobro por 2 vías (payment y
 * subscription_authorized_payment): las dos usan el id del pago de MP
 * (`pay_<id>`), así el cobro se registra y se manda a Meta UNA sola vez.
 * Las renovaciones NO se mandan a Meta (decisión de negocio).
 */
async function recordSubscriptionCharge(
  sb: Sb,
  opts: { user: MatchedUser; mpPaymentId: string; subscriptionId: string | null; planType: SubPlan; amount: number },
) {
  const promo = opts.planType === "pro" && isDiscountedMonthly(opts.amount) ? DISCOUNT_CODE : null;
  const { data: inserted, error } = await sb
    .from("payments")
    .upsert(
      {
        user_id: opts.user.id,
        mp_id: `pay_${opts.mpPaymentId}`,
        kind: "subscription",
        plan: opts.planType,
        promo,
        installments: 1,
        mp_subscription_id: opts.subscriptionId,
        amount: opts.amount,
        currency: "ARS",
        status: "approved",
        email: opts.user.email,
      },
      { onConflict: "mp_id", ignoreDuplicates: true },
    )
    .select("id");
  if (error) {
    console.error("[webhook] recordSubscriptionCharge error:", error);
    return;
  }
  if (!inserted || inserted.length === 0) return; // ya registrado por la otra vía

  // ¿Es el primer cobro de esta suscripción?
  let isFirst = true;
  if (opts.subscriptionId) {
    const { count } = await sb
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("mp_subscription_id", opts.subscriptionId);
    isFirst = (count ?? 0) <= 1;
  }
  if (!isFirst) {
    console.log(`[webhook] renovación ${opts.user.email} $${opts.amount} — no se avisa a Meta`);
    return;
  }

  await sendMetaPurchase({
    email: opts.user.email,
    phone: opts.user.phone,
    value: opts.amount,
    currency: "ARS",
    eventId: `purchase_${opts.mpPaymentId}`,
    contentName: productName(opts.planType, !!promo),
    contentId: opts.planType,
    orderId: opts.mpPaymentId,
    externalId: opts.user.id,
    fbp: opts.user.meta_fbp,
    fbc: opts.user.meta_fbc,
  });
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
    // OJO: NO subir el monto acá. MP cobra el 1er pago DIFERIDO; el bump del
    // descuento va SOLO tras el primer cobro real.
  } else if (subscription.status === "cancelled" || subscription.status === "paused") {
    const { user, matchedBy } = await findUser(sb, lookup);
    if (!user) {
      console.warn(
        `[webhook/preapproval] SIN MATCH (${subscription.status}) sub=${subscription.id}`,
      );
      return;
    }
    // No corta el acceso en el momento: sigue con el plan hasta que venza el
    // período pagado.
    const patch: Record<string, unknown> = { mp_subscription_id: null, updated_at: new Date().toISOString() };
    if (user.plan === "pro") {
      patch.expires_at = periodEndFromLastCharge(subscription, planType) ?? user.expires_at;
    }
    await sb.from("users").update(patch).eq("id", user.id);
    await recordFunnelEventForUser(user.id, "plan_cancelado_mp", subscription.status);
    console.log(`[webhook/preapproval] ${user.email} plan=${user.plan} vence=${patch.expires_at ?? user.expires_at ?? "-"} (${subscription.status}, matchedBy=${matchedBy})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTION_AUTHORIZED_PAYMENT: cobro de la suscripción (1º o renovación).
// ─────────────────────────────────────────────────────────────────────────────
async function handleAuthorizedPayment(authPaymentId: string) {
  const ap = await mpGetAuthorizedPayment(authPaymentId);
  const paid = ap.status === "processed" || ap.payment?.status === "approved";
  const sb = supabaseAdmin();

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

  // SALVAGUARDA: activamos el plan de forma optimista en el alta (MP cobra el
  // 1er pago DIFERIDO). Si ese PRIMER cobro se RECHAZA, lo revertimos a free.
  // Una renovación rechazada NO se toca: MP reintenta.
  if (!paid) {
    const nuncaCobro = subscription ? !subscription.summarized?.last_charged_date : true;
    if (user && user.plan !== "free" && user.plan !== "pase" && nuncaCobro) {
      await sb.from("users").update({
        plan: "free", credits: 0, expires_at: null, mp_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      await recordFunnelEventForUser(user.id, "pago_rechazado", "1er_cobro_revertido");
      console.warn(`[webhook/authpay] 1er cobro RECHAZADO → ${user.email} revertido a free (authpay=${authPaymentId})`);
    } else {
      console.log(`[webhook/authpay] ${authPaymentId} no aprobado (status=${ap.status}) — sin reversión`);
    }
    return;
  }

  if (!user) {
    console.warn(`[webhook/authpay] SIN MATCH preapproval=${ap.preapproval_id}`);
    return;
  }

  const amount = ap.transaction_amount ?? subscription?.auto_recurring?.transaction_amount ?? PRO_PRICE_ARS;
  const planType: SubPlan = subscription
    ? detectPlanType(subscription.preapproval_plan_id, ap.transaction_amount ?? subscription.auto_recurring?.transaction_amount)
    : (user.plan === "semanal" || user.plan === "trimestral") ? user.plan : "pro";

  await activateOrRenewPlan(sb, user, { subscriptionId: ap.preapproval_id, planType });
  console.log(`[webhook/authpay] ${user.email} ${planType} $${amount} (matchedBy=${matchedBy})`);

  if (subscription) await bumpDiscountedAmountIfNeeded(subscription);

  await recordSubscriptionCharge(sb, {
    user,
    // Mismo id que el aviso "payment" del mismo cobro → no se duplica.
    mpPaymentId: ap.payment?.id ? String(ap.payment.id) : `authpay_${authPaymentId}`,
    subscriptionId: ap.preapproval_id,
    planType,
    amount,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT: pago suelto. Puede ser (a) el Pase de cuatrimestre, (b) un cobro de
// suscripción, o (c) un pago de OTRO negocio que comparte la cuenta de MP →
// se ignora.
// ─────────────────────────────────────────────────────────────────────────────
async function handlePayment(paymentId: string) {
  const payment = await mpGetPayment(paymentId);

  // (a) Pase de cuatrimestre (pago único, identificado por su metadata).
  if (isSkillioPasePayment(payment)) {
    const r = await activatePasePayment(payment);
    console.log(`[webhook/payment] pase ${paymentId} → ${r.status}`);
    return;
  }

  if (payment.status !== "approved") return;

  // (c) Sin suscripción y sin marca de Skillio → no es nuestro. Antes un monto
  // desconocido caía en "pro" y podía regalar acceso si el mail coincidía.
  if (!payment.preapproval_id) {
    console.log(`[webhook/payment] ${paymentId} ignorado: no es de Skillio ($${payment.transaction_amount})`);
    return;
  }

  // (b) Cobro de suscripción.
  const sb = supabaseAdmin();
  const { user, matchedBy } = await findUser(sb, {
    preapprovalId: payment.preapproval_id,
    externalRef: payment.external_reference,
    payerEmail: payment.payer?.email,
  });
  if (!user) {
    console.warn(`[webhook/payment] SIN MATCH payment=${paymentId} preapproval=${payment.preapproval_id}`);
    return;
  }

  const amount = payment.transaction_amount ?? 0;
  let planType: SubPlan;
  try {
    const sub = await mpGetSubscription(payment.preapproval_id);
    planType = detectPlanType(sub.preapproval_plan_id, amount || sub.auto_recurring?.transaction_amount);
    await bumpDiscountedAmountIfNeeded(sub);
  } catch {
    planType = detectPlanType(undefined, amount);
  }

  await activateOrRenewPlan(sb, user, { subscriptionId: payment.preapproval_id, planType });
  console.log(`[webhook/payment] ${user.email} ${planType} $${amount} (matchedBy=${matchedBy})`);

  await recordSubscriptionCharge(sb, {
    user,
    mpPaymentId: String(payment.id),
    subscriptionId: payment.preapproval_id,
    planType,
    amount: amount > 0 ? amount : PLANS[planType].amount,
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
    } else if (type === "payment" || type.startsWith("payment.")) {
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
