import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription } from "@/lib/mercadopago";

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

function creditsForPlan(planId: string): number {
  if (planId === process.env.MP_PLAN_ID_PRO) return 500;
  if (planId === process.env.MP_PLAN_ID_BASICO) return 30;
  return 500;
}

function planNameForId(planId: string): "pro" | "basico" {
  return planId === process.env.MP_PLAN_ID_BASICO ? "basico" : "pro";
}

// Recompensa al referrer cuando convierte 2 referidos pagos
async function processReferrerReward(
  sb: ReturnType<typeof supabaseAdmin>,
  referrerId: string,
) {
  // Contar referidos convertidos
  const { count } = await sb
    .from("referrals")
    .select("*", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "converted");

  const converted = count ?? 0;

  // Cada 2 referidos convertidos → dar recompensa
  if (converted > 0 && converted % 2 === 0) {
    const { data: referrer } = await sb
      .from("users")
      .select("plan, credits")
      .eq("id", referrerId)
      .maybeSingle();

    if (!referrer) return;

    // Básico → +200 créditos, PRO → +150 créditos
    const bonus = referrer.plan === "pro" ? 150 : 200;
    await sb
      .from("users")
      .update({ credits: referrer.credits + bonus })
      .eq("id", referrerId);

    console.log(
      `[webhook] referrer ${referrerId} recompensado con ${bonus} créditos (${converted} referidos)`,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type !== "preapproval" || !body.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const subscriptionId = String(body.data.id);

    if (!verifySignature(req, subscriptionId)) {
      console.warn("[webhooks/mercadopago] firma inválida");
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    const subscription = await mpGetSubscription(subscriptionId);
    const sb = supabaseAdmin();

    const clerkUserId = subscription.external_reference;
    const payerEmail = subscription.payer_email;
    const matchField = clerkUserId ? "clerk_user_id" : "email";
    const matchValue = clerkUserId ?? payerEmail;

    if (subscription.status === "authorized") {
      const baseCredits = creditsForPlan(subscription.preapproval_plan_id);
      const plan = planNameForId(subscription.preapproval_plan_id);

      // Traer usuario para ver si tiene referred_by
      const { data: user } = await sb
        .from("users")
        .select("id, referred_by, credits")
        .eq(matchField, matchValue)
        .maybeSingle();

      // Créditos finales: base del plan + 50 si es referido
      const isReferred = !!user?.referred_by;
      const totalCredits = baseCredits + (isReferred ? 50 : 0);

      await sb
        .from("users")
        .update({
          plan,
          mp_subscription_id: subscription.id,
          credits: totalCredits,
          updated_at: new Date().toISOString(),
        })
        .eq(matchField, matchValue);

      // Si es referido: marcar referral como convertido y procesar recompensa
      if (user?.referred_by) {
        await sb
          .from("referrals")
          .update({
            status: "converted",
            converted_at: new Date().toISOString(),
          })
          .eq("referred_id", user.id)
          .eq("status", "pending");

        await processReferrerReward(sb, user.referred_by);
      }
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
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhooks/mercadopago]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
