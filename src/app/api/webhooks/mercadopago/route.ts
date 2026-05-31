import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription, mpGetPayment } from "@/lib/mercadopago";

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

function planForId(planId: string): "pro" | "basico" {
  return planId === process.env.MP_PLAN_ID_BASICO ? "basico" : "pro";
}

function fullCreditsForPlan(plan: "pro" | "basico"): number {
  return plan === "pro" ? 500 : 30;
}

// Procesa recompensa al referrer: 150 créditos cada 2 referidos convertidos
async function processReferrerReward(
  sb: ReturnType<typeof supabaseAdmin>,
  referrerId: string,
) {
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
      .update({ credits: referrer.credits + 150 })
      .eq("id", referrerId);

    console.log(`[webhook] referrer ${referrerId} +150 créditos (${converted} referidos)`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PREAPPROVAL: cambios de estado de la suscripción
// "authorized" → activar plan con 30 créditos de trial (no completos aún)
// "cancelled" / "paused" → bajar a free
// ─────────────────────────────────────────────────────────────────────────────
async function handlePreapproval(subscriptionId: string) {
  const subscription = await mpGetSubscription(subscriptionId);
  const sb = supabaseAdmin();

  const clerkUserId = subscription.external_reference;
  const payerEmail = subscription.payer_email;
  const matchField = clerkUserId ? "clerk_user_id" : "email";
  const matchValue = clerkUserId ?? payerEmail;

  if (subscription.status === "authorized") {
    const plan = planForId(subscription.preapproval_plan_id);
    await sb
      .from("users")
      .update({
        plan,
        mp_subscription_id: subscription.id,
        credits: 30, // créditos de trial: 30 para todos hasta el primer cobro real
        updated_at: new Date().toISOString(),
      })
      .eq(matchField, matchValue);

    console.log(`[webhook/preapproval] ${matchValue} activado plan=${plan} (30 créditos trial)`);
  } else if (
    subscription.status === "cancelled" ||
    subscription.status === "paused"
  ) {
    await sb
      .from("users")
      .update({
        plan: "free",
        mp_subscription_id: null,
        credits: 0,
        updated_at: new Date().toISOString(),
      })
      .eq(matchField, matchValue);

    console.log(`[webhook/preapproval] ${matchValue} bajado a free`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HANDLER PAYMENT: pago real procesado (primer cobro o renovación mensual)
// - Dar créditos completos del plan
// - Si tiene referido pendiente: +50 créditos + marcar convertido + reward referrer
// ─────────────────────────────────────────────────────────────────────────────
async function handlePayment(paymentId: string) {
  const payment = await mpGetPayment(paymentId);

  if (payment.status !== "approved") return;

  const sb = supabaseAdmin();

  // Buscar usuario por email del pagador
  const payerEmail = payment.payer?.email;
  if (!payerEmail) return;

  const { data: user } = await sb
    .from("users")
    .select("id, plan, credits, referred_by")
    .eq("email", payerEmail)
    .maybeSingle();

  if (!user || user.plan === "free") return;

  // Verificar si hay referral pendiente (primer pago)
  const { data: pendingReferral } = await sb
    .from("referrals")
    .select("id, referrer_id")
    .eq("referred_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  const isFirstPayment = !!pendingReferral;
  const referralBonus = isFirstPayment ? 50 : 0;
  const fullCredits = fullCreditsForPlan(user.plan) + referralBonus;

  await sb
    .from("users")
    .update({
      credits: fullCredits,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  console.log(
    `[webhook/payment] ${payerEmail} → ${fullCredits} créditos (plan=${user.plan}, referralBonus=${referralBonus})`,
  );

  // Procesar referral si es el primer pago
  if (isFirstPayment && pendingReferral) {
    await sb
      .from("referrals")
      .update({
        status: "converted",
        converted_at: new Date().toISOString(),
      })
      .eq("id", pendingReferral.id);

    await processReferrerReward(sb, pendingReferral.referrer_id);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataId = String(body.data?.id ?? "");

    if (!dataId) return NextResponse.json({ ok: true });

    if (!verifySignature(req, dataId)) {
      console.warn("[webhooks/mercadopago] firma inválida");
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    if (body.type === "preapproval") {
      await handlePreapproval(dataId);
    } else if (body.type === "payment") {
      await handlePayment(dataId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhooks/mercadopago]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
