"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { PDFDocument } from "pdf-lib";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Note } from "@/lib/types";

const BUCKET = "notes-uploads";

export type CommunityMeta = {
  kind: string;
  university: string | null;
  career: string | null;
  subject: string | null;
  year: number | null;
  month: number | null;
  title: string;
};

// Detecta si el PDF fue generado/exportado por Skillio (el PDF brandeado setea
// Author="Skillio"). Sirve para NO dejar compartir resúmenes de Skillio en la
// comunidad (protege la conversión a PRO). Best-effort: si no se puede leer, no
// bloquea.
async function isSkillioGeneratedPdf(
  sb: ReturnType<typeof supabaseAdmin>,
  filePath: string,
): Promise<boolean> {
  try {
    const dl = await sb.storage.from(BUCKET).download(filePath);
    if (dl.error || !dl.data) return false;
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const marks = [doc.getAuthor(), doc.getCreator(), doc.getProducer(), doc.getTitle()]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return marks.includes("skillio") || marks.includes("skilio");
  } catch {
    return false;
  }
}

async function requireUserRow() {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!data) throw new Error("user_row_missing");
  return { sb, user_id: data.id as string };
}

export async function listNotes(): Promise<Note[]> {
  const { sb, user_id } = await requireUserRow();
  const { data, error } = await sb
    .from("notes")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[notes.list]", error);
    return [];
  }
  return (data ?? []) as Note[];
}

export async function deleteNote(id: string) {
  const { sb, user_id } = await requireUserRow();

  // Buscar para conseguir el file_path
  const { data: note } = await sb
    .from("notes")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (note?.file_path) {
    await sb.storage.from(BUCKET).remove([note.file_path]);
  }

  const { error } = await sb
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) throw new Error(error.message);

  revalidatePath("/app/apuntes");
  revalidatePath("/app/comunidad");
}

// Comparte un apunte a la Comunidad con su categorización. Bloquea PDFs
// generados por Skillio.
export async function shareNoteToCommunity(noteId: string, meta: CommunityMeta) {
  const { sb, user_id } = await requireUserRow();

  const title = meta.title?.trim();
  if (!title) throw new Error("title_required");
  if (!meta.kind) throw new Error("kind_required");

  const { data: note } = await sb
    .from("notes")
    .select("id, file_path, file_type")
    .eq("id", noteId)
    .eq("user_id", user_id)
    .single();
  if (!note) throw new Error("not_found");

  if (note.file_type === "pdf" && (await isSkillioGeneratedPdf(sb, note.file_path))) {
    throw new Error("skillio_generated");
  }

  const { error } = await sb
    .from("notes")
    .update({
      is_public: true,
      title,
      comm_kind: meta.kind,
      comm_university: meta.university?.trim() || null,
      comm_career: meta.career?.trim() || null,
      comm_subject: meta.subject?.trim() || null,
      comm_year: meta.year,
      comm_month: meta.month,
    })
    .eq("id", noteId)
    .eq("user_id", user_id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/apuntes");
  revalidatePath("/app/comunidad");
}

export async function unshareNote(noteId: string) {
  const { sb, user_id } = await requireUserRow();
  const { error } = await sb
    .from("notes")
    .update({ is_public: false })
    .eq("id", noteId)
    .eq("user_id", user_id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/apuntes");
  revalidatePath("/app/comunidad");
}

export async function toggleNotePublic(id: string) {
  const { sb, user_id } = await requireUserRow();
  const { data: current } = await sb
    .from("notes")
    .select("is_public")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();
  if (!current) throw new Error("not_found");

  const { error } = await sb
    .from("notes")
    .update({ is_public: !current.is_public })
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/apuntes");
  revalidatePath("/app/comunidad");
}
