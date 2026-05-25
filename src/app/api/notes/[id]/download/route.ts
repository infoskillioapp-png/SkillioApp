import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "notes-uploads";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sb = supabaseAdmin();

  // Permitir descargar si: es del propio user, o es publico
  const { data: u } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!u) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const { data: note } = await sb
    .from("notes")
    .select("id, user_id, file_path, is_public")
    .eq("id", id)
    .single();
  if (!note) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const allowed = note.user_id === u.id || note.is_public;
  if (!allowed)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Si es publico y lo descarga otro usuario, contar (best-effort, no atomico)
  if (note.is_public && note.user_id !== u.id) {
    const { data: row } = await sb
      .from("notes")
      .select("downloads")
      .eq("id", id)
      .single();
    if (row) {
      await sb
        .from("notes")
        .update({ downloads: (row.downloads ?? 0) + 1 })
        .eq("id", id);
    }
  }

  const { data: signed, error } = await sb.storage
    .from(BUCKET)
    .createSignedUrl(note.file_path, 60);

  if (error || !signed) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
