import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveActor } from "@/lib/actor";
import { normalizeEmail, isDisposableEmail } from "@/lib/anti-fraude";
import { sendResultRescueEmail } from "@/lib/email/resend";
import { recordFunnelEventForUser } from "@/lib/api/funnel";

const ANON_COOKIE = "skillio_anon";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rescate del embudo anónimo: al cerrar el paywall sin pagar, el usuario deja su
// mail para no perder el resultado. Guardamos el mail en la fila anónima (deja
// armado el match del webhook por email en Fase 3) y le mandamos un link para
// volver desde cualquier dispositivo.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const outputId = typeof body.output_id === "string" ? body.output_id : "";

    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    if (!outputId)
      return NextResponse.json({ error: "output_id_required" }, { status: 400 });

    const actor = await resolveActor();
    const sb = supabaseAdmin();

    // Solo guardamos el mail en filas anónimas; nunca pisamos el de una cuenta ya
    // registrada. Si el mail ya existe en otra fila (unique), no rompemos: igual
    // mandamos el link.
    if (actor.isAnon) {
      const { error } = await sb
        .from("users")
        .update({ email, normalized_email: normalizeEmail(email) })
        .eq("id", actor.id)
        .is("clerk_user_id", null);
      if (error) console.warn("[rescue] no se guardó el mail en la fila anon:", error.message);
    }

    // Token de la sesión anónima → link para volver cross-device.
    const session = (await cookies()).get(ANON_COOKIE)?.value ?? "";
    const path = session ? `/r/${outputId}?s=${session}` : `/r/${outputId}`;

    await sendResultRescueEmail(email, path);
    await recordFunnelEventForUser(actor.id, "rescate_mail", "resumen");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/public/rescue]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
