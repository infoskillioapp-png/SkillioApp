import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Note } from "@/lib/types";

const BUCKET = "notes-uploads";

export const MODEL = "claude-sonnet-4-6";

export type NoteContent =
  | { type: "pdf"; data: Uint8Array; fileName: string }
  | { type: "text"; text: string; fileName: string }
  | { type: "image"; data: Uint8Array; mime: string; fileName: string }
  | { type: "unsupported"; fileName: string };

/**
 * Trae el contenido binario o de texto de un apunte del usuario actual.
 * Falla si el apunte no es del usuario logueado.
 */
export async function getNoteContent(noteId: string): Promise<{
  note: Note;
  content: NoteContent;
  userRow: { id: string; credits: number; plan: string };
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const sb = supabaseAdmin();

  const { data: u } = await sb
    .from("users")
    .select("id, credits, plan")
    .eq("clerk_user_id", userId)
    .single();
  if (!u) throw new Error("user_not_found");

  const { data: note } = await sb
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", u.id)
    .single();
  if (!note) throw new Error("note_not_found");

  const typedNote = note as Note;

  const dl = await sb.storage.from(BUCKET).download(typedNote.file_path);
  if (dl.error || !dl.data) throw new Error("storage_download_failed");

  const arr = new Uint8Array(await dl.data.arrayBuffer());
  const mime = dl.data.type || "";

  let content: NoteContent;
  if (typedNote.file_type === "pdf" || mime === "application/pdf") {
    content = { type: "pdf", data: arr, fileName: typedNote.file_name };
  } else if (typedNote.file_type === "image" || mime.startsWith("image/")) {
    content = {
      type: "image",
      data: arr,
      mime: mime || "image/png",
      fileName: typedNote.file_name,
    };
  } else if (typedNote.file_type === "text" || mime.startsWith("text/")) {
    content = {
      type: "text",
      text: new TextDecoder("utf-8").decode(arr),
      fileName: typedNote.file_name,
    };
  } else {
    content = { type: "unsupported", fileName: typedNote.file_name };
  }

  return { note: typedNote, content, userRow: u };
}

/**
 * Cobra creditos al usuario. Tira si no le alcanza.
 */
export async function chargeCredits(
  userId: string,
  amount: number,
): Promise<number> {
  const sb = supabaseAdmin();
  const { data: u } = await sb
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();
  if (!u) throw new Error("user_not_found");
  if (u.credits < amount) throw new Error("insufficient_credits");

  const remaining = u.credits - amount;
  await sb.from("users").update({ credits: remaining }).eq("id", userId);
  return remaining;
}

/**
 * Guarda un output generado por la IA.
 */
export async function saveAiOutput(opts: {
  user_id: string;
  note_id: string | null;
  kind: "summary" | "flashcards" | "simulacro";
  format?: string | null;
  title?: string | null;
  content: unknown;
  credits_used: number;
}) {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("ai_outputs")
    .insert({
      user_id: opts.user_id,
      note_id: opts.note_id,
      kind: opts.kind,
      format: opts.format ?? null,
      title: opts.title ?? null,
      content: opts.content as object,
      credits_used: opts.credits_used,
      model: MODEL,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[ai.saveOutput]", error);
    throw new Error(error.message);
  }
  return data.id as string;
}

/**
 * Construye el campo `content` (multipart) para mandar a Claude.
 * - PDF / imagen: `file` part con el buffer
 * - texto: lo inyecta directo en el prompt
 */
export function buildUserContent(content: NoteContent, instruction: string) {
  if (content.type === "pdf") {
    return [
      {
        type: "file" as const,
        mediaType: "application/pdf",
        data: content.data,
        filename: content.fileName,
      },
      { type: "text" as const, text: instruction },
    ];
  }
  if (content.type === "image") {
    return [
      {
        type: "file" as const,
        mediaType: content.mime,
        data: content.data,
        filename: content.fileName,
      },
      { type: "text" as const, text: instruction },
    ];
  }
  if (content.type === "text") {
    const trimmed =
      content.text.length > 60_000
        ? content.text.slice(0, 60_000) + "\n\n[...truncado]"
        : content.text;
    return `Apunte: "${content.fileName}"\n\n---\n${trimmed}\n---\n\n${instruction}`;
  }
  throw new Error("unsupported_content_type");
}
