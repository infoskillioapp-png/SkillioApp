import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveActor } from "@/lib/actor";
import { NOTES_BUCKET, slugify, resolveFileMeta } from "@/lib/notes/upload-helpers";

// Devuelve una URL firmada para que el navegador suba el archivo DIRECTO a
// Supabase Storage, sin pasar por una función de Vercel (que topea el body en
// ~4,5 MB y rompía con apuntes escaneados grandes). Este request es chiquito:
// solo el nombre y el mime, nunca el archivo.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const browserMime = typeof body.mime === "string" ? body.mime : undefined;
  if (!fileName) return NextResponse.json({ error: "fileName required" }, { status: 400 });

  const meta = resolveFileMeta(fileName, browserMime);
  if (!meta.allowed)
    return NextResponse.json({ error: "file_type_not_allowed", name: fileName }, { status: 415 });

  let u: { id: string };
  try {
    u = await resolveActor();
  } catch {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const path = `${u.id}/${Date.now()}-${slugify(fileName)}`;
  const { data, error } = await supabaseAdmin().storage
    .from(NOTES_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[notes.upload-url]", error);
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.json({ path, token: data.token, kind: meta.kind, mime: meta.mime });
}
