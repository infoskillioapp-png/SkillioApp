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
  return 500; // fallback seguro para planes legacy
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
      const credits = creditsForPlan(subscription.preapproval_plan_id);
      await sb
        .from("users")
        .update({
          plan: subscription.preapproval_plan_id === process.env.MP_PLAN_ID_BASICO
            ? "basico"
            : "pro",
          mp_subscription_id: subscription.id,
          credits,
          updated_at: new Date().toISOString(),
        })
        .eq(matchField, matchValue);
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
