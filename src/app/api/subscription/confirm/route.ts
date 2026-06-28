import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription } from "@/lib/mercadopago";

const SEMANAL_DAYS = 7;
const TRIMESTRAL_DAYS = 90;
const PRO_CREDITS = 500;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const preapprovalId = String(body.preapproval_id ?? "");
  if (!preapprovalId)
    return NextResponse.json({ error: "missing preapproval_id" }, { status: 400 });

  let subscription;
  try {
    subscription = await mpGetSubscription(preapprovalId);
  } catch (e) {
    console.error("[subscription/confirm] mpGetSubscription falló", e);
    return NextResponse.json({ error: "mp_fetch_failed" }, { status: 502 });
  }

  if (subscription.status !== "authorized" && subscription.status !== "pending") {
    return NextResponse.json(
      { error: "subscription_not_active", status: subscription.status },
      { status: 409 },
    );
  }

  // Determinar tipo de plan por el plan MP al que pertenece la suscripción
  const pid = subscription.preapproval_plan_id;
  const isSemanal = pid === process.env.MP_PLAN_ID_SEMANAL;
  const isTrimestral = pid === process.env.MP_PLAN_ID_TRIMESTRAL;
  const plan = isSemanal ? ("semanal" as const) : isTrimestral ? ("trimestral" as const) : ("pro" as const);
  const expiresAt = isSemanal
    ? new Date(Date.now() + SEMANAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : isTrimestral
      ? new Date(Date.now() + TRIMESTRAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id, plan, credits")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });

  if (user.plan === "free") {
    const patch: Record<string, unknown> = {
      plan,
      mp_subscription_id: subscription.id,
      credits: isSemanal ? 0 : PRO_CREDITS,
      updated_at: new Date().toISOString(),
    };
    if (expiresAt) patch.expires_at = expiresAt;

    const { error } = await sb.from("users").update(patch).eq("id", user.id);
    if (error) {
      console.error(`[subscription/confirm] update falló (user=${user.id}, plan=${plan}):`, error);
      return NextResponse.json({ error: "activation_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, plan });
}
