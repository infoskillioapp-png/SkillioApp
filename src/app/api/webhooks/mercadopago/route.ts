import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription } from "@/lib/mercadopago";

function verifySignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secret configurado, se omite la validación

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";

  const ts = xSignature.match(/ts=([^,]+)/)?.[1] ?? "";
  const v1 = xSignature.match(/v1=([^,]+)/)?.[1] ?? "";
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts}`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return expected === v1;
}

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

    if (!verifySignature(req, subscriptionId)) {
      console.warn("[webhooks/mercadopago] firma inválida");
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

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
