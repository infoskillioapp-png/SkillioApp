import "server-only";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { Note } from "@/lib/types";
import { sendCreditsExhaustedEmail } from "@/lib/email/resend";
import { sendMetaEvent } from "@/lib/meta-capi";

const BUCKET = "notes-uploads";

export const MODEL = "claude-sonnet-4-6";              // PRO
export const MODEL_FREE = "claude-haiku-4-5-20251001"; // free trial (3 gen): barato
export const FREE_GENERATION_LIMIT = 3;
const MAP_MODEL = MODEL_FREE; // modelo barato para el paso de mapeo

/** Modelo a usar según el plan: PRO = Sonnet, free = Haiku. */
export function modelForPlan(plan: string): string {
  return plan === "pro" ? MODEL : MODEL_FREE;
}

// Umbral: si el texto supera esto, activamos map-reduce
const MAP_REDUCE_THRESHOLD = 15_000; // ~4k tokens
const CHUNK_SIZE = 14_000;

export type NoteContent =
  | { type: "pdf"; data: Uint8Array; fileName: string }
  | { type: "text"; text: string; fileName: string }
  | { type: "image"; data: Uint8Array; mime: string; fileName: string }
  | { type: "unsupported"; fileName: string };

export async function getNoteContent(noteId: string): Promise<{
  note: Note;
  content: NoteContent;
  userRow: { id: string; credits: number; plan: string; free_generations_used: number };
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const sb = supabaseAdmin();

  const { data: u } = await sb
    .from("users")
    .select("id, credits, plan, free_generations_used")
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
 * Consume una de las generaciones gratis del free (trial sin tarjeta).
 * `current` es el valor leído al inicio del request (de getNoteContent).
 */
export async function consumeFreeGeneration(
  userId: string,
  current: number,
): Promise<void> {
  const sb = supabaseAdmin();
  const next = current + 1;
  await sb
    .from("users")
    .update({ free_generations_used: next })
    .eq("id", userId);

  // Al consumir la última generación gratis → mail "se te acabaron los créditos".
  if (next === FREE_GENERATION_LIMIT) {
    const { data } = await sb
      .from("users")
      .select("email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (data?.email) await sendCreditsExhaustedEmail(data.email, data.full_name);
  }
}

/**
 * Marca la ACTIVACIÓN del usuario: su primera generación con material PROPIO
 * (cualquier ruta /api/ai/*; el demo guiado NO cuenta). El evento "Activacion"
 * representa intención real (no curiosidad) y es el que conviene optimizar en
 * Meta. Idempotente y a prueba de carreras: el UPDATE condicional
 * `activated_at IS NULL` garantiza que solo una generación gane.
 *
 * Devuelve el event_id si esta fue la activación (para que el cliente dispare el
 * píxel con el mismo id y Meta deduplique pixel + CAPI), o null si ya estaba
 * activado.
 */
export async function markActivationIfFirst(userId: string): Promise<string | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .update({ activated_at: new Date().toISOString() })
    .eq("id", userId)
    .is("activated_at", null)
    .select("id, email, phone")
    .maybeSingle();

  if (error) {
    console.error("[activation] update error:", error);
    return null;
  }
  if (!data) return null; // ya estaba activado

  const eventId = randomUUID();
  await sendMetaEvent({
    eventName: "Activacion",
    email: data.email,
    phone: data.phone,
    eventId,
  });
  return eventId;
}

export async function saveAiOutput(opts: {
  user_id: string;
  note_id: string | null;
  kind: "summary" | "flashcards" | "simulacro";
  format?: string | null;
  title?: string | null;
  content: unknown;
  credits_used: number;
  model?: string;
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
      model: opts.model ?? MODEL,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[ai.saveOutput]", error);
    throw new Error(error.message);
  }
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Map-reduce para textos largos
// Divide el texto en chunks, resume cada uno con Haiku en paralelo,
// y devuelve el texto combinado listo para pasarle al modelo final.
// ---------------------------------------------------------------------------
const MAP_SYSTEM =
  "Sos un asistente académico. Resumí los conceptos clave de este fragmento de apunte preservando definiciones técnicas, fórmulas, nombres y fechas exactas. Sé exhaustivo.";

async function mapReduceText(text: string): Promise<string> {
  // Dividir en chunks
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  // Mapear: resumir cada chunk en paralelo con Haiku (barato)
  const summaries = await Promise.all(
    chunks.map((chunk, idx) =>
      generateText({
        model: anthropic(MAP_MODEL),
        system: MAP_SYSTEM,
        messages: [
          {
            role: "user",
            content: `[Fragmento ${idx + 1} de ${chunks.length}]\n\n${chunk}`,
          },
        ],
      }).then((r) => `[Sección ${idx + 1}]\n${r.text}`),
    ),
  );

  // Reducir: combinar resúmenes
  return summaries.join("\n\n");
}

// ---------------------------------------------------------------------------
// buildUserContent — construye el content para el mensaje de usuario.
// Para PDFs e imágenes: pasa el binario directo con cache control.
// Para texto largo: aplica map-reduce antes de mandarlo al modelo final.
// ---------------------------------------------------------------------------
export async function buildUserContent(
  content: NoteContent,
  instruction: string,
) {
  if (content.type === "pdf") {
    // PDF nativo — Anthropic lo procesa directamente.
    // Cache control: si el mismo usuario genera resumen + flashcards del mismo
    // apunte, la segunda llamada reutiliza el PDF del cache (~90% más barata).
    return [
      {
        type: "file" as const,
        mediaType: "application/pdf" as const,
        data: content.data,
        filename: content.fileName,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { type: "text" as const, text: instruction },
    ];
  }

  if (content.type === "image") {
    return [
      {
        type: "file" as const,
        mediaType: content.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        data: content.data,
        filename: content.fileName,
        experimental_providerMetadata: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      { type: "text" as const, text: instruction },
    ];
  }

  if (content.type === "text") {
    let processedText = content.text;

    if (content.text.length > MAP_REDUCE_THRESHOLD) {
      // Texto largo → map-reduce con Haiku antes del modelo final
      processedText = await mapReduceText(content.text);
    }

    // Truncado de seguridad para el modelo final
    const finalText =
      processedText.length > 80_000
        ? processedText.slice(0, 80_000) + "\n\n[...truncado]"
        : processedText;

    return `Apunte: "${content.fileName}"\n\n---\n${finalText}\n---\n\n${instruction}`;
  }

  throw new Error("unsupported_content_type");
}
