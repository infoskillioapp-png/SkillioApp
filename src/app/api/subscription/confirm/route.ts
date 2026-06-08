import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription } from "@/lib/mercadopago";

// Confirmación post-pago: el usuario vuelve de MercadoPago con ?preapproval_id=
// Activamos el plan directamente desde su sesión, sin depender del webhook
// (que puede tardar o fallar por mismatch de email).
// Sin free_trial: al pagar se otorga el acceso PRO completo (500 créditos) ya.
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

  // La suscripción debe estar autorizada (o pendiente de primer cobro por trial)
  if (subscription.status !== "authorized" && subscription.status !== "pending") {
    return NextResponse.json(
      { error: "subscription_not_active", status: subscription.status },
      { status: 409 },
    );
  }

  // Plan único: toda suscripción activa es PRO.
  const plan = "pro" as const;

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id, plan, credits")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Solo activamos si todavía está en free (no pisar un plan ya activo)
  if (user.plan === "free") {
    const { error } = await sb
      .from("users")
      .update({
        plan,
        mp_subscription_id: subscription.id,
        credits: 500, // acceso PRO completo al instante (sin free_trial)
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (error) {
      // No fallar en silencio: si el update se rechaza (p.ej. constraint),
      // devolvemos error para que /pago-exitoso NO redirija como si hubiera
      // activado, y quede registro en logs.
      console.error(`[subscription/confirm] update falló (user=${user.id}, plan=${plan}):`, error);
      return NextResponse.json({ error: "activation_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, plan });
}
