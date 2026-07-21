import "server-only";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { PDFDocument } from "pdf-lib";
import mammoth from "mammoth";
import type { Note } from "@/lib/types";
import { sendCreditsExhaustedEmail } from "@/lib/email/resend";
import { sendMetaEvent } from "@/lib/meta-capi";

const BUCKET = "notes-uploads";

export const MODEL = "claude-sonnet-4-6";              // planes pagos, razonamiento pesado
export const MODEL_FREE = "claude-haiku-4-5-20251001"; // free + volumen (tarjetas/simulacro)
export const FREE_GENERATION_LIMIT = 3;                // conservado para emails de nudge
const MAP_MODEL = MODEL_FREE;

/** Devuelve true si el usuario tiene acceso pago activo (créditos o tiempo vigente).
 * Mensual sin expires_at (el caso normal, suscripción activa) = acceso siempre.
 * Con expires_at seteado (cancelado, sigue con acceso hasta esa fecha) = solo
 * hasta que venza, igual que semanal/trimestral. */
export function isPaidPlan(plan: string, expiresAt: string | null): boolean {
  if (plan === "pro") return !expiresAt || new Date(expiresAt) > new Date();
  if (plan === "semanal" || plan === "trimestral")
    return !!expiresAt && new Date(expiresAt) > new Date();
  return false;
}

/**
 * Modelo según plan y tipo de generación.
 * - free: Haiku para todo (barato, US$0.02/usuario)
 * - pago + summarize: Sonnet (razonamiento pesado)
 * - pago + flashcards/simulacro: Haiku (volumen, 48% más barato)
 */
export function modelForGeneration(
  plan: string,
  expiresAt: string | null,
  kind: "summarize" | "flashcards" | "simulacro",
): string {
  if (!isPaidPlan(plan, expiresAt)) return MODEL_FREE;
  return kind === "summarize" ? MODEL : MODEL_FREE;
}

// Umbral: si el texto supera esto, activamos map-reduce
const MAP_REDUCE_THRESHOLD = 15_000; // ~4k tokens
const CHUNK_SIZE = 14_000;

export type NoteContent =
  | { type: "pdf"; data: Uint8Array; fileName: string }
  | { type: "text"; text: string; fileName: string }
  | { type: "word"; text: string; fileName: string }
  | { type: "image"; data: Uint8Array; mime: string; fileName: string }
  | { type: "unsupported"; fileName: string };

type NoteUserRow = {
  id: string;
  credits: number;
  plan: string;
  free_generations_used: number;
  expires_at: string | null;
};

export async function getNoteContent(
  noteId: string,
  actor?: NoteUserRow,
): Promise<{
  note: Note;
  content: NoteContent;
  userRow: NoteUserRow;
}> {
  const sb = supabaseAdmin();

  // Identidad: si el caller ya resolvió el actor (embudo público, Clerk o
  // anónimo) lo usamos tal cual; si no, mantenemos el flujo Clerk histórico.
  let u: NoteUserRow;
  if (actor) {
    u = actor;
  } else {
    const { userId } = await auth();
    if (!userId) throw new Error("unauthenticated");
    const { data } = await sb
      .from("users")
      .select("id, credits, plan, free_generations_used, expires_at")
      .eq("clerk_user_id", userId)
      .single();
    if (!data) throw new Error("user_not_found");
    u = data as NoteUserRow;
  }

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

  let arr = new Uint8Array(await dl.data.arrayBuffer());
  const mime = dl.data.type || "";

  // Divisor de PDFs: si el apunte tiene rango de páginas, extraemos solo ese fragmento
  if (
    (typedNote.file_type === "pdf" || mime === "application/pdf") &&
    typedNote.page_from != null &&
    typedNote.page_to != null
  ) {
    try {
      const fullDoc = await PDFDocument.load(arr, { ignoreEncryption: true });
      const sub = await PDFDocument.create();
      const from0 = typedNote.page_from - 1; // pdf-lib es 0-indexed
      const to0 = Math.min(typedNote.page_to - 1, fullDoc.getPageCount() - 1);
      const indices = Array.from({ length: to0 - from0 + 1 }, (_, k) => from0 + k);
      const pages = await sub.copyPages(fullDoc, indices);
      pages.forEach((p) => sub.addPage(p));
      const saved = await sub.save();
      arr = new Uint8Array(saved.buffer as ArrayBuffer);
    } catch (e) {
      console.warn("[getNoteContent] no se pudo slicear el PDF, se usa completo:", e);
    }
  }

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
  } else if (
    typedNote.file_type === "word" &&
    (mime.includes("wordprocessingml") || typedNote.file_name.toLowerCase().endsWith(".docx"))
  ) {
    // Solo .docx (Word moderno, 2007+): mammoth lee el XML del paquete OOXML.
    // El .doc viejo (binario, pre-2007) no lo soporta esta librería.
    try {
      const { value: text } = await mammoth.extractRawText({ buffer: Buffer.from(arr) });
      content = { type: "word", text, fileName: typedNote.file_name };
    } catch (e) {
      console.warn("[getNoteContent] no se pudo extraer texto del Word:", e);
      content = { type: "unsupported", fileName: typedNote.file_name };
    }
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

/**
 * Gate para usuarios free: devuelve true si pueden generar (no tienen ningún
 * ai_output previo). Una vez que completaron su 1 suite, queda bloqueado.
 * No hay race condition: todos los calls paralelos del mismo suite pasan (0 outputs),
 * y el segundo intento los encuentra todos bloqueados (3 outputs).
 */
export async function isFreeGenerationAllowed(userId: string): Promise<boolean> {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("ai_outputs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) === 0;
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
  input_tokens?: number | null;
  output_tokens?: number | null;
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
      input_tokens: opts.input_tokens ?? null,
      output_tokens: opts.output_tokens ?? null,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[ai.saveOutput]", error);
    throw new Error(error.message);
  }

  // "notes.has_ai_content" es lo que leen /materias y el home para decidir si
  // mostrar "Sin generar aún" o el % de dominio — hasta ahora nunca se
  // seteaba en ningún lado, así que quedaba en false para siempre aunque el
  // apunte ya tuviera resumen/tarjetas/simulacro guardados.
  if (opts.note_id) {
    const { error: noteErr } = await sb
      .from("notes")
      .update({ has_ai_content: true })
      .eq("id", opts.note_id);
    if (noteErr) console.error("[ai.saveOutput] no se pudo marcar has_ai_content:", noteErr);
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
// Auto-split de PDFs grandes
// Anthropic procesa PDFs nativos hasta cierto límite. Si el PDF es largo, lo
// troceamos automáticamente en el servidor (pdf-lib, por rango de páginas),
// condensamos cada parte con Haiku en paralelo (map) y combinamos (reduce). El
// usuario no divide nada a mano. Devuelve el texto condensado, o null si el PDF
// es chico (→ se manda nativo) o no se pudo parsear.
// ---------------------------------------------------------------------------
const PDF_NATIVE_PAGE_LIMIT = 30;     // umbral general "PDF chico" para map-reduce
const FREE_INPUT_PAGE_CAP = 5;        // free: solo las primeras 5 págs del apunte (abarata el input)
const FREE_INPUT_CHAR_CAP = 15_000;   // free (Word): equivalente aprox. a 5 páginas de texto
const PDF_PRO_NATIVE_LIMIT = 60;      // pro: nativo hasta aquí antes de map-reduce
const PDF_CHUNK_PAGES = 25;           // tamaño de cada trozo en map-reduce
const PDF_MAX_PAGES = 400;            // tope de seguridad

const PDF_MAP_SYSTEM =
  "Sos un asistente académico. Resumí de forma EXHAUSTIVA los conceptos clave de esta parte de un apunte, preservando definiciones técnicas, fórmulas, nombres, fechas y datos exactos. No omitas nada importante. No agregues introducciones ni cierres: solo el contenido condensado.";

async function condensePdfChunk(
  bytes: Uint8Array,
  idx: number,
  total: number,
): Promise<string> {
  const r = await generateText({
    model: anthropic(MAP_MODEL),
    system: PDF_MAP_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file" as const,
            mediaType: "application/pdf" as const,
            data: bytes,
            filename: `parte-${idx + 1}.pdf`,
          },
          {
            type: "text" as const,
            text: `[Parte ${idx + 1} de ${total}] Condensá exhaustivamente esta parte del apunte.`,
          },
        ],
      },
    ],
  });
  return `[Sección ${idx + 1} de ${total}]\n${r.text}`;
}

/**
 * Si el PDF supera el límite nativo, lo trocea y condensa a texto. Devuelve el
 * texto combinado listo para el modelo final, o null si conviene mandarlo nativo.
 */
async function maybeCondensePdf(bytes: Uint8Array): Promise<string | null> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch (e) {
    // No se pudo parsear (raro/encriptado) → que lo intente Anthropic nativo.
    console.warn("[pdf-split] no se pudo cargar el PDF, se manda nativo:", e);
    return null;
  }

  const total = doc.getPageCount();
  if (total <= PDF_NATIVE_PAGE_LIMIT) return null; // chico → nativo

  const pageCount = Math.min(total, PDF_MAX_PAGES);

  // Partir en sub-PDFs por rango de páginas.
  const chunks: Uint8Array[] = [];
  for (let start = 0; start < pageCount; start += PDF_CHUNK_PAGES) {
    const end = Math.min(start + PDF_CHUNK_PAGES, pageCount);
    const sub = await PDFDocument.create();
    const indices = Array.from({ length: end - start }, (_, k) => start + k);
    const pages = await sub.copyPages(doc, indices);
    pages.forEach((p) => sub.addPage(p));
    chunks.push(await sub.save());
  }

  // Map (paralelo) + reduce.
  const parts = await Promise.all(
    chunks.map((c, i) => condensePdfChunk(c, i, chunks.length)),
  );
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// buildUserContent — construye el content para el mensaje de usuario.
// Para PDFs e imágenes: pasa el binario directo con cache control.
// Para texto largo: aplica map-reduce antes de mandarlo al modelo final.
//
// isPaid: false → usuarios free/semanal. Se limitan a las primeras
// PDF_NATIVE_PAGE_LIMIT páginas sin map-reduce (barato, ~$0.03/llamada con
// caché). true → usuarios pro con map-reduce completo para PDFs grandes.
// ---------------------------------------------------------------------------
export async function buildUserContent(
  content: NoteContent,
  instruction: string,
  isPaid = true,
) {
  if (content.type === "pdf") {
    let pdfData = content.data;

    if (!isPaid) {
      // FREE: solo las primeras FREE_INPUT_PAGE_CAP (5) páginas del apunte, sin
      // map-reduce. El apunte ya viene ≤30 págs (divisor de PDF), así que esto
      // recorta el input de verdad y mantiene el costo por llamada muy bajo. Con
      // 5 páginas la IA genera pocos puntos: el resumen free muestra 2 bien
      // desarrollados y el resto queda bloqueado (ver prompt/schema free).
      try {
        const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
        if (doc.getPageCount() > FREE_INPUT_PAGE_CAP) {
          const sub = await PDFDocument.create();
          const indices = Array.from({ length: FREE_INPUT_PAGE_CAP }, (_, k) => k);
          const pages = await sub.copyPages(doc, indices);
          pages.forEach((p) => sub.addPage(p));
          const saved = await sub.save();
          pdfData = new Uint8Array(saved.buffer as ArrayBuffer);
        }
      } catch (e) {
        console.warn("[buildUserContent] free PDF cap failed:", e);
      }
      return [
        {
          type: "file" as const,
          mediaType: "application/pdf" as const,
          data: pdfData,
          filename: content.fileName,
        },
        { type: "text" as const, text: instruction },
      ];
    }

    // PAID: nativo hasta 60 páginas; map-reduce solo para PDFs muy grandes.
    // Esto cubre ~95% de los apuntes universitarios reales sin condensación.
    try {
      const doc = await PDFDocument.load(pdfData, { ignoreEncryption: true });
      if (doc.getPageCount() <= PDF_PRO_NATIVE_LIMIT) {
        return [
          {
            type: "file" as const,
            mediaType: "application/pdf" as const,
            data: pdfData,
            filename: content.fileName,
          },
          { type: "text" as const, text: instruction },
        ];
      }
    } catch { /* no se pudo leer el doc, cae al map-reduce */ }

    const condensed = await maybeCondensePdf(content.data);
    if (condensed) {
      const finalText =
        condensed.length > 80_000
          ? condensed.slice(0, 80_000) + "\n\n[...truncado]"
          : condensed;
      return `Apunte: "${content.fileName}" (procesado por partes)\n\n---\n${finalText}\n---\n\n${instruction}`;
    }

    // Sin cache control: generate-suite dispara resumen/tarjetas/simulacro en
    // PARALELO (Promise.allSettled), así que ninguna llamada llega a
    // aprovechar el caché que escribe otra — solo se paga el recargo de
    // "cache write" de Anthropic sin ningún ahorro real a cambio.
    return [
      {
        type: "file" as const,
        mediaType: "application/pdf" as const,
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
        mediaType: content.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
        data: content.data,
        filename: content.fileName,
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

  if (content.type === "word") {
    if (!isPaid) {
      // FREE: mismo criterio que el PDF (primeras ~5 páginas), pero en
      // caracteres porque un Word extraído a texto no tiene "páginas".
      const sliced =
        content.text.length > FREE_INPUT_CHAR_CAP
          ? content.text.slice(0, FREE_INPUT_CHAR_CAP)
          : content.text;
      return `Apunte: "${content.fileName}"\n\n---\n${sliced}\n---\n\n${instruction}`;
    }

    let processedText = content.text;
    if (content.text.length > MAP_REDUCE_THRESHOLD) {
      processedText = await mapReduceText(content.text);
    }
    const finalText =
      processedText.length > 80_000
        ? processedText.slice(0, 80_000) + "\n\n[...truncado]"
        : processedText;

    return `Apunte: "${content.fileName}"\n\n---\n${finalText}\n---\n\n${instruction}`;
  }

  throw new Error("unsupported_content_type");
}
