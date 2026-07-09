import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ANON_COOKIE = "skillio_anon";
const ONE_YEAR = 60 * 60 * 24 * 365;

// Adopta una sesión anónima desde el link de rescate por mail (?s=…) y redirige
// al resultado, seteando la cookie skillio_anon en este dispositivo. Riesgo
// bajo: el contenido bloqueado no tiene valor real, así que "robar" una sesión
// solo da acceso a un resumen recortado.
export async function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams.get("s") ?? "";
  const to = req.nextUrl.searchParams.get("to") ?? "";
  const origin = req.nextUrl.origin;

  // Solo permitimos volver a una pantalla de resultado /r/<id>.
  const safeTo = /^\/r\/[a-zA-Z0-9-]+$/.test(to) ? to : "/generar";
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
