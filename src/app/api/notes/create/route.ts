import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recordFunnelEventForUser } from "@/lib/api/funnel";
import { resolveActor } from "@/lib/actor";
import { NOTES_BUCKET, resolveFileMeta } from "@/lib/notes/upload-helpers";

// Crea la(s) fila(s) de notes para un archivo YA subido a Storage por el
// navegador (via /api/notes/upload-url). Solo recibe metadata (path, nombre,
// mime, tamaño, segmentos) — el archivo nunca pasa por acá, así que no hay
// límite de body. Reemplaza el segundo paso de /api/notes/upload para archivos
// grandes; la lógica de creación de filas es la misma.
type Segment = { title: string; page_from: number; page_to: number };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const path = typeof body.path === "string" ? body.path : "";
  const fileName = typeof body.fileName === "string" ? body.fileName : "";
  const fileSize = typeof body.fileSize === "number" ? body.fileSize : 0;
  const subject_id = (body.subject_id as string) || null;
  const segments = Array.isArray(body.segments) ? (body.segments as Segment[]) : null;
  if (!path || !fileName) return NextResponse.json({ error: "path and fileName required" }, { status: 400 });

  const meta = resolveFileMeta(fileName, body.mime);
  const title = (typeof body.title === "string" && body.title.trim()) || fileName.replace(/\.[^.]+$/, "");

  let u: { id: string };
  try {
    u = await resolveActor();
  } catch {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const sb = supabaseAdmin();

  // Seguridad: el path tiene que empezar con la carpeta del propio usuario
  // (así se lo dio /api/notes/upload-url). Evita que se cree una nota
  // apuntando a un archivo de otro usuario.
  if (!path.startsWith(`${u.id}/`)) {
    return NextResponse.json({ error: "path_mismatch" }, { status: 403 });
  }

  const base = {
    user_id: u.id,
    subject_id,
    file_name: fileName,
    file_path: path,
    file_type: meta.kind,
    file_size_bytes: fileSize,
  };

  if (segments && segments.length > 0) {
    const inserted: unknown[] = [];
    for (const seg of segments) {
      const { data, error } = await sb
        .from("notes")
        .insert({ ...base, title: seg.title.trim() || title, page_from: seg.page_from, page_to: seg.page_to })
        .select("*")
        .single();
      if (error) Sentry.captureException(error, { extra: { step: "create_segment" } });
      else inserted.push(data);
    }
    if (!inserted.length) {
      await sb.storage.from(NOTES_BUCKET).remove([path]);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
    await recordFunnelEventForUser(u.id, "apunte_subido", meta.kind, { segments: inserted.length });
    return NextResponse.json({ ok: true, notes: inserted, note: inserted[0] });
  }

  const { data: inserted, error } = await sb
    .from("notes")
    .insert({ ...base, title })
    .select("*")
    .single();
  if (error) {
    Sentry.captureException(error, { extra: { step: "create_note" } });
    await sb.storage.from(NOTES_BUCKET).remove([path]);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  await recordFunnelEventForUser(u.id, "apunte_subido", meta.kind);
  return NextResponse.json({ ok: true, note: inserted });
}
