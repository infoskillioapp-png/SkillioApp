import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpCancelSubscription } from "@/lib/mercadopago";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sb = supabaseAdmin();

  const { data: u, error: ue } = await sb
    .from("users")
    .select("id, plan, mp_subscription_id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (ue || !u) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Cancelar en MercadoPago si tiene suscripción activa
  if (u.mp_subscription_id) {
    try {
      await mpCancelSubscription(u.mp_subscription_id);
    } catch (e) {
      console.error("[subscription/cancel] MP cancel error:", e);
      // Continuamos igual — el webhook también puede disparar el downgrade
    }
  }

  const { error } = await sb
    .from("users")
    .update({ plan: "free", mp_subscription_id: null, updated_at: new Date().toISOString() })
    .eq("id", u.id);

  if (error) {
    console.error("[subscription/cancel]", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
