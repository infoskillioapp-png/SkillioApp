import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "notes-uploads";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_PREFIXES = [
  "application/pdf",
  "image/",
  "text/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
];

// Fallback por extensión: muchos navegadores (mobile, Drive, WhatsApp, archivos
// renombrados) mandan file.type vacío o "application/octet-stream". Sin esto,
// rechazábamos archivos válidos a algunos usuarios (a otros no).
const EXT_MAP: Record<string, { kind: string; mime: string }> = {
  pdf: { kind: "pdf", mime: "application/pdf" },
  png: { kind: "image", mime: "image/png" },
  jpg: { kind: "image", mime: "image/jpeg" },
  jpeg: { kind: "image", mime: "image/jpeg" },
  webp: { kind: "image", mime: "image/webp" },
  gif: { kind: "image", mime: "image/gif" },
  heic: { kind: "image", mime: "image/heic" },
  heif: { kind: "image", mime: "image/heif" },
  txt: { kind: "text", mime: "text/plain" },
  md: { kind: "text", mime: "text/markdown" },
  doc: { kind: "word", mime: "application/msword" },
  docx: {
    kind: "word",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Decide si el archivo es válido y qué tipo/mime guardar. Primero confía en el
// MIME del navegador (si es uno conocido); si viene vacío/genérico, cae a la
// extensión del nombre.
function resolveFile(file: File): { allowed: boolean; kind: string; mime: string } {
  const mime = file.type || "";
  const mimeAllowed =
    mime !== "" &&
    mime !== "application/octet-stream" &&
    ALLOWED_PREFIXES.some((p) => mime.startsWith(p));

  if (mimeAllowed) {
    const kind =
      mime === "application/pdf"
        ? "pdf"
        : mime.startsWith("image/")
          ? "image"
          : mime.startsWith("text/")
            ? "text"
            : "word";
    return { allowed: true, kind, mime };
  }

  const byExt = EXT_MAP[fileExt(file.name)];
  if (byExt) return { allowed: true, kind: byExt.kind, mime: byExt.mime };

  return { allowed: false, kind: "file", mime: mime || "application/octet-stream" };
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid form" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "no file" }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "file_too_big", max_mb: 25 }, { status: 413 });

  const resolved = resolveFile(file);
  if (!resolved.allowed) {
    // Visible en Sentry: si vuelve a fallar un tipo, lo vemos con nombre+mime real.
    Sentry.captureMessage("upload_file_type_rejected", {
      level: "warning",
      extra: { name: file.name, type: file.type, size: file.size },
    });
    return NextResponse.json(
      { error: "file_type_not_allowed", type: file.type || "(vacío)", name: file.name },
      { status: 415 },
    );
  }

  const title = ((form.get("title") as string) || file.name).trim();
  const subject_id = (form.get("subject_id") as string) || null;

  const sb = supabaseAdmin();

  // Resolver user_id
  const { data: u } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!u) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  // Upload a Storage (usamos el mime resuelto, no el del navegador que puede venir vacío)
  const path = `${u.id}/${Date.now()}-${slugify(file.name)}`;
  const buf = await file.arrayBuffer();
  const up = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: resolved.mime,
    upsert: false,
  });
  if (up.error) {
    console.error("[notes.upload] storage", up.error);
    Sentry.captureException(up.error, { extra: { step: "storage", name: file.name } });
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  // Insert row
  const { data: inserted, error: insErr } = await sb
    .from("notes")
    .insert({
      user_id: u.id,
      subject_id: subject_id || null,
      title,
      file_name: file.name,
      file_path: path,
      file_type: resolved.kind,
      file_size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insErr) {
    console.error("[notes.upload] insert", insErr);
    Sentry.captureException(insErr, { extra: { step: "insert", name: file.name } });
    // rollback storage
    await sb.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, note: inserted });
}
