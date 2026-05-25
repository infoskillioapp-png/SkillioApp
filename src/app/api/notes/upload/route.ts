import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = "notes-uploads";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_PREFIXES = ["application/pdf", "image/", "text/", "application/msword", "application/vnd.openxmlformats-officedocument"];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function inferType(mime: string, name: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("word") || name.toLowerCase().endsWith(".docx")) return "word";
  if (mime.startsWith("text/")) return "text";
  return "file";
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
  if (!ALLOWED_PREFIXES.some((p) => file.type.startsWith(p)))
    return NextResponse.json({ error: "file_type_not_allowed" }, { status: 415 });

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

  // Upload a Storage
  const path = `${u.id}/${Date.now()}-${slugify(file.name)}`;
  const buf = await file.arrayBuffer();
  const up = await sb.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });
  if (up.error) {
    console.error("[notes.upload] storage", up.error);
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
      file_type: inferType(file.type, file.name),
      file_size_bytes: file.size,
    })
    .select("*")
    .single();

  if (insErr) {
    console.error("[notes.upload] insert", insErr);
    // rollback storage
    await sb.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, note: inserted });
}
