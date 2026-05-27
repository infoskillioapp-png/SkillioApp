import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription } from "@/lib/mercadopago";

// MercadoPago notifica eventos de suscripciones (preapproval).
// Cuando status = "authorized" → activar plan PRO.
// Cuando status = "cancelled" | "paused" → bajar a free.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Solo procesamos notificaciones de suscripciones
    if (body.type !== "preapproval" || !body.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const subscriptionId = String(body.data.id);
    const subscription = await mpGetSubscription(subscriptionId);

    const clerkUserId = subscription.external_reference;
    if (!clerkUserId) return NextResponse.json({ ok: true });

    const sb = supabaseAdmin();

    if (subscription.status === "authorized") {
      await sb
        .from("users")
        .update({
          plan: "pro",
          mp_subscription_id: subscription.id,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", clerkUserId);
    } else if (
      subscription.status === "cancelled" ||
      subscription.status === "paused"
    ) {
      await sb
        .from("users")
        .update({
          plan: "free",
          mp_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("clerk_user_id", clerkUserId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[webhooks/mercadopago]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
