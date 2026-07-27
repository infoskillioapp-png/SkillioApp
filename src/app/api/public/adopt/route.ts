import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ANON_COOKIE = "skillio_anon";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Adopta una sesión anónima desde el link de rescate por mail (?s=…) y redirige
// a la vista de resultado (/app/ia/resumen) o al PDF (?to=pdf, regalo #2),
// seteando la cookie skillio_anon en este dispositivo. Riesgo bajo: el
// contenido bloqueado no tiene valor real, así que "robar" una sesión solo da
// acceso a un resumen recortado (o su PDF).
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams.get("s") ?? "";
  const noteId = req.nextUrl.searchParams.get("note_id") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const origin = req.nextUrl.origin;

  const safeTo = /^[a-zA-Z0-9-]+$/.test(noteId)
    ? to === "pdf"
      ? `/api/ai/resumen-pdf?note_id=${noteId}`
      : `/app/ia/resumen?note_id=${noteId}`
    : "/app";
  const res = NextResponse.redirect(new URL(safeTo, origin));

  if (!s) return res;

  // Verificamos que la sesión exista antes de adoptarla.
  const { data } = await supabaseAdmin()
    .from("users")
    .select("id")
    .eq("anon_session_id", s)
    .maybeSingle();

  if (data) {
    res.cookies.set(ANON_COOKIE, s, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }
  return res;
}
