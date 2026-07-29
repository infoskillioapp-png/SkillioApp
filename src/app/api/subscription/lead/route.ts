import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveActor } from "@/lib/actor";
import { normalizeEmail, isDisposableEmail } from "@/lib/anti-fraude";
import { recordFunnelEventForUser } from "@/lib/api/funnel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Paso 1 del checkout embebido: guarda el mail + teléfono ANTES de la tarjeta.
// Clave para recuperación de abandonos: si el usuario se cae en el paso de la
// tarjeta (donde más se cae la gente), igual quedamos con su contacto para
// re-impactarlo por mail/WhatsApp. No activa nada ni cobra.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const rawPhone = typeof body.phone === "string" ? body.phone : "";
    const phone = rawPhone.replace(/[^\d+]/g, "").slice(0, 20);

    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    if (phone.replace(/\D/g, "").length < 6)
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

    const actor = await resolveActor();
    const sb = supabaseAdmin();

    // El mail solo se guarda en filas anónimas (nunca pisamos una cuenta
    // registrada). Si choca con el UNIQUE de otra sesión, seguimos igual.
    if (actor.isAnon) {
      const { error } = await sb
        .from("users")
        .update({ email, normalized_email: normalizeEmail(email) })
        .eq("id", actor.id)
        .is("clerk_user_id", null);
      if (error) console.warn("[lead] email no guardado:", error.message);
    }
    await sb.from("users").update({ phone }).eq("id", actor.id);

    await recordFunnelEventForUser(actor.id, "checkout_datos", "pro");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/subscription/lead]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
