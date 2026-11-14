import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveActor } from "@/lib/actor";
import { isPaidPlan } from "@/lib/ai/claude";
import { recordFunnelEventForUser } from "@/lib/api/funnel";

// ¿Le mostramos el regalo 25% OFF al cerrar el paywall? UNA sola vez por
// usuario (cuenta o sesión anónima): se marca de forma atómica — solo la
// primera llamada que encuentra discount_offered_at vacío recibe show:true.
export async function POST() {
  try {
    const actor = await resolveActor();
    if (isPaidPlan(actor.plan, actor.expires_at)) return NextResponse.json({ show: false });

    const { data } = await supabaseAdmin()
      .from("users")
      .update({ discount_offered_at: new Date().toISOString() })
      .eq("id", actor.id)
      .is("discount_offered_at", null)
      .select("id");

    const show = !!data && data.length > 0;
    if (show) await recordFunnelEventForUser(actor.id, "descuento_ofrecido", null);
    return NextResponse.json({ show });
  } catch (e) {
    console.error("[api/public/discount-offer]", e);
    return NextResponse.json({ show: false });
  }
}
