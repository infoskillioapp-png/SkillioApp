import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Guarda el teléfono de contacto del usuario logueado. Se usa en el paso final
// de /pago-exitoso (embudo anónimo, tras el auto-login) y es opcional. Va sobre
// la cuenta activa vía la sesión de Clerk, así que sirve tanto para la cuenta
// recién creada como para una existente reutilizada.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = typeof body.phone === "string" ? body.phone : "";
  const phone = raw.replace(/[^\d+]/g, "").slice(0, 20);
  if (phone.replace(/\D/g, "").length < 6)
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from("users")
    .update({ phone })
    .eq("clerk_user_id", userId);
  if (error) {
    console.error("[api/me/phone] update", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
