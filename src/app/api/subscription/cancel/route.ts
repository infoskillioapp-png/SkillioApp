import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpCancelSubscription, mpGetSubscription, periodEndFromLastCharge } from "@/lib/mercadopago";
import { recordFunnelEventForUser } from "@/lib/api/funnel";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sb = supabaseAdmin();

  const { data: u, error: ue } = await sb
    .from("users")
    .select("id, plan, mp_subscription_id, expires_at")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (ue || !u) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const planType = u.plan === "semanal" || u.plan === "trimestral" ? u.plan : "pro";

  // No corta el acceso en el momento: cancela el DÉBITO futuro en MercadoPago,
  // pero deja el plan vigente hasta el fin del período ya pagado.
  let periodEnd: string | null = u.expires_at ?? null;
  if (u.mp_subscription_id) {
    try {
      const sub = await mpGetSubscription(u.mp_subscription_id);
      const estimated = periodEndFromLastCharge(sub, planType);
      if (estimated) periodEnd = estimated;
    } catch (e) {
      console.error("[subscription/cancel] no se pudo leer la suscripción antes de cancelar:", e);
    }
    try {
      await mpCancelSubscription(u.mp_subscription_id);
    } catch (e) {
      console.error("[subscription/cancel] MP cancel error:", e);
      // Continuamos igual — el webhook también puede disparar el downgrade
    }
  }

  const patch: Record<string, unknown> = { mp_subscription_id: null, updated_at: new Date().toISOString() };
  if (u.plan === "pro") patch.expires_at = periodEnd; // mensual no tenía expires_at hasta ahora
  // semanal/trimestral ya tienen expires_at correcto de su última renovación: no se toca.

  const { error } = await sb.from("users").update(patch).eq("id", u.id);

  if (error) {
    console.error("[subscription/cancel]", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  await recordFunnelEventForUser(u.id, "plan_cancelado", u.plan);

  return NextResponse.json({ ok: true, plan: u.plan, expires_at: patch.expires_at ?? u.expires_at });
}
