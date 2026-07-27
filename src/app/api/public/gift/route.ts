import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveActor } from "@/lib/actor";
import { normalizeEmail, isDisposableEmail } from "@/lib/anti-fraude";
import { recordFunnelEventForUser } from "@/lib/api/funnel";
import {
  sendTechniquesEmail, sendResumenLinkEmail, sendBonusGenerationEmail, sendDiscountEmail,
} from "@/lib/email/resend";

const ANON_COOKIE = "skillio_anon";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DISCOUNT_CODE = "SKILLIO25";
export const DISCOUNT_PCT = 25;

type GiftType = "techniques" | "resumen_pdf" | "bonus_gen" | "discount";

// Captura de mail en el embudo anónimo, enmarcada como REGALO. Un solo endpoint
// para los 4 popups: guarda el mail en la fila (anónima) del usuario, ejecuta la
// acción del regalo (ej: +1 generación) y manda el mail correspondiente.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body.type as GiftType;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const noteId = typeof body.note_id === "string" ? body.note_id : "";

    if (!["techniques", "resumen_pdf", "bonus_gen", "discount"].includes(type))
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });

    const actor = await resolveActor();
    const sb = supabaseAdmin();

    // Guardamos el mail solo en filas anónimas (nunca pisamos el de una cuenta).
    if (actor.isAnon) {
      const { error } = await sb
        .from("users")
        .update({ email, normalized_email: normalizeEmail(email) })
        .eq("id", actor.id)
        .is("clerk_user_id", null);
      if (error) console.warn("[gift] no se guardó el mail:", error.message);
    }

    // Acción + mail según el tipo de regalo.
    if (type === "techniques") {
      await sendTechniquesEmail(email);
    } else if (type === "resumen_pdf") {
      if (!noteId) return NextResponse.json({ error: "note_id_required" }, { status: 400 });
      const session = (await cookies()).get(ANON_COOKIE)?.value ?? "";
      const path = session
        ? `/api/public/adopt?s=${session}&note_id=${noteId}`
        : `/app/ia/resumen?note_id=${noteId}`;
      await sendResumenLinkEmail(email, path);
    } else if (type === "bonus_gen") {
      // +1 generación, UNA sola vez por fila (evita abuso reenviando el form).
      const { data: u } = await sb
        .from("users")
        .select("bonus_generations")
        .eq("id", actor.id)
        .maybeSingle();
      if ((u?.bonus_generations ?? 0) === 0) {
        await sb.from("users").update({ bonus_generations: 1 }).eq("id", actor.id);
      }
      await sendBonusGenerationEmail(email);
    } else if (type === "discount") {
      await sendDiscountEmail(email, DISCOUNT_CODE, DISCOUNT_PCT);
    }

    await recordFunnelEventForUser(actor.id, "regalo_mail", type);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/public/gift]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
