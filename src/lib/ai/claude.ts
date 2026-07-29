import "server-only";
import { randomUUID } from "crypto";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { PDFDocument } from "pdf-lib";
import { extractText } from "unpdf";
import mammoth from "mammoth";
import type { Note } from "@/lib/types";
import { sendMetaEvent } from "@/lib/meta-capi";

const BUCKET = "notes-uploads";

// Modelos Gemini (migración desde Anthropic, jul-2026, ~50% más barato).
// El resumen pago corre en 3.6-flash (el más capaz); todo lo demás y el free
// en 3.5-flash-lite (rápido y barato). Ver skillio-unit-economics.
export const MODEL = "gemini-3.6-flash";        // planes pagos, resumen
export const MODEL_FREE = "gemini-3.5-flash-lite"; // free + volumen (tarjetas/simulacro)
export const FREE_GENERATION_LIMIT = 3;                // conservado para emails de nudge
const MAP_MODEL = MODEL_FREE;

const google = createGoogleGenerativeAI(); // lee GOOGLE_GENERATIVE_AI_API_KEY

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
  // Todo corre en Lite (incluido el resumen): con el prompt estricto Lite
  // resume bien y el costo baja ~6x, clave para usuarios de alto volumen y
  // PDFs escaneados. VÁLVULA DE SEGURIDAD futura: si con datos reales vemos
  // que Lite falla en apuntes de matemática/física pesada, se puede rutear
  // esos a MODEL (3.6-flash) acá, detectándolos por heurística del contenido.
  void plan; void expiresAt; void kind;
  return MODEL_FREE;
}

// Umbral: si el texto supera esto, activamos map-reduce
const MAP_REDUCE_THRESHOLD = 15_000; // ~4k tokens
const CHUNK_SIZE = 14_000;
// Debajo de esto, la extracción de PDF se considera "sin texto real" (PDF
// escaneado como imagen) y se cae al modo nativo (mandar el archivo).
const MIN_USABLE_PDF_TEXT = 300;

export type NoteContent =
  // extractedText: texto plano sacado del PDF una sola vez en getNoteContent
  // (sin IA de por medio). Si viene null, la extracción falló o el PDF es un
  // escaneo sin texto real — buildUserContent cae al modo nativo (manda el
  // archivo) como hacía siempre, sin romper nada.
  | { type: "pdf"; data: Uint8Array; fileName: string; extractedText: string | null }
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
    // Extracción mecánica (sin IA, no cuesta nada) UNA sola vez, sobre el PDF
    // ya recortado al rango de páginas de arriba. Si sale bien, las 3
    // generaciones (resumen/tarjetas/simulacro) reusan este mismo texto en
    // vez de mandar el PDF completo 3 veces cada una.
    let extractedText: string | null = null;
    try {
      // OJO: unpdf (pdf.js) "transfiere" el ArrayBuffer al worker interno y lo
      // DEJA VACÍO — si le pasamos `arr` directo, después de esto arr.length
      // queda en 0. Cuando la extracción falla (PDF escaneado/sin texto) y hay
      // que caer al modo nativo, ese arr vacío se le mandaba a Anthropic →
      // "PDF cannot be empty". Le pasamos una COPIA: que vacíe la copia, no el
      // original que necesitamos para el fallback nativo.
      const { text } = await extractText(arr.slice(), { mergePages: true });
      extractedText = text.trim().length >= MIN_USABLE_PDF_TEXT ? text : null;
    } catch (e) {
      console.warn("[getNoteContent] no se pudo extraer texto del PDF, se manda nativo:", e);
    }
    // Condensar (si hace falta) ACÁ, una sola vez — no en buildUserContent,
    // que se llama 3 veces (una por generación) y antes repetía este trabajo
    // por triplicado en paralelo. isPaid: free nunca condensa, solo recorta.
    if (extractedText) {
      extractedText = await condenseIfNeeded(extractedText, isPaidPlan(u.plan, u.expires_at));
    }
    content = { type: "pdf", data: arr, fileName: typedNote.file_name, extractedText };
  } else if (typedNote.file_type === "image" || mime.startsWith("image/")) {
    content = {
      type: "image",
      data: arr,
      mime: mime || "image/png",
      fileName: typedNote.file_name,
    };
  } else if (typedNote.file_type === "text" || mime.startsWith("text/")) {
    // Ojo: a diferencia de PDF/Word, este camino nunca distinguió free/paid
    // (siempre condensaba si era largo) — se mantiene ese mismo criterio,
    // solo que ahora se hace acá (una vez) en vez de en buildUserContent
    // (que se llamaba 3 veces).
    const rawText = new TextDecoder("utf-8").decode(arr);
    content = {
      type: "text",
      text: rawText.length > MAP_REDUCE_THRESHOLD ? await mapReduceText(rawText) : rawText,
      fileName: typedNote.file_name,
    };
  } else if (
    typedNote.file_type === "word" &&
    (mime.includes("wordprocessingml") || typedNote.file_name.toLowerCase().endsWith(".docx"))
  ) {
    // Solo .docx (Word moderno, 2007+): mammoth lee el XML del paquete OOXML.
    // El .doc viejo (binario, pre-2007) no lo soporta esta librería.
    try {
      const { value: rawText } = await mammoth.extractRawText({ buffer: Buffer.from(arr) });
      const text = await condenseIfNeeded(rawText, isPaidPlan(u.plan, u.expires_at));
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
 * Gate para usuarios free. Puede generar hasta `1 + bonus_generations` apuntes
 * DISTINTOS de por vida. Si `noteId` es un apunte que YA generó, siempre se
 * permite (generar más modos on-demand de su propio apunte no cuenta como nuevo).
 * El bonus lo otorga el popup-regalo "dejá tu mail y te damos 1 generación más".
 */
export async function isFreeGenerationAllowed(userId: string, noteId?: string): Promise<boolean> {
  const sb = supabaseAdmin();
  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("note_id")
    .eq("user_id", userId);
  const noteIds = (outputs ?? []).map((o) => o.note_id as string);
  // Generar más modos de un apunte ya generado → permitido (no es "apunte nuevo").
  if (noteId && noteIds.includes(noteId)) return true;
  const distintos = new Set(noteIds).size;
  const { data: u } = await sb
    .from("users")
    .select("bonus_generations")
    .eq("id", userId)
    .maybeSingle();
  return distintos < 1 + (u?.bonus_generations ?? 0);
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

// Condensa UNA vez si el texto supera el umbral (solo pagos — free nunca
// condensa, se recorta por caracteres en buildUserContent). Se llama desde
// getNoteContent, que corre una sola vez por request aunque generate-suite
// dispare resumen/tarjetas/simulacro en paralelo — antes cada una de esas 3
// llamadas condensaba el mismo texto por su cuenta, triplicando el trabajo.
async function condenseIfNeeded(text: string, isPaid: boolean): Promise<string> {
  if (!isPaid || text.length <= MAP_REDUCE_THRESHOLD) return text;
  return mapReduceText(text);
}

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
        model: google(MAP_MODEL),
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
    model: google(MAP_MODEL),
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
    // Texto ya extraído en getNoteContent (una sola vez, sin IA). Si está
    // disponible lo mandamos como texto plano — mismo criterio que Word — en
    // vez de subir el PDF completo de nuevo en cada una de las 3 llamadas.
    // Si no (PDF escaneado, extracción falló), cae al modo nativo de abajo,
    // igual que se hacía antes de este cambio.
    if (content.extractedText) {
      if (!isPaid) {
        const sliced =
          content.extractedText.length > FREE_INPUT_CHAR_CAP
            ? content.extractedText.slice(0, FREE_INPUT_CHAR_CAP)
            : content.extractedText;
        return `Apunte: "${content.fileName}"\n\n---\n${sliced}\n---\n\n${instruction}`;
      }

      // Ya viene condensado (si hacía falta) desde getNoteContent — acá solo
      // el tope de seguridad final, sin volver a condensar.
      const finalText =
        content.extractedText.length > 80_000
          ? content.extractedText.slice(0, 80_000) + "\n\n[...truncado]"
          : content.extractedText;

      return `Apunte: "${content.fileName}"\n\n---\n${finalText}\n---\n\n${instruction}`;
    }

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
    // Ya viene condensado (si hacía falta) desde getNoteContent.
    const finalText =
      content.text.length > 80_000
        ? content.text.slice(0, 80_000) + "\n\n[...truncado]"
        : content.text;

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

    // Ya viene condensado (si hacía falta) desde getNoteContent.
    const finalText =
      content.text.length > 80_000
        ? content.text.slice(0, 80_000) + "\n\n[...truncado]"
        : content.text;

    return `Apunte: "${content.fileName}"\n\n---\n${finalText}\n---\n\n${instruction}`;
  }

  throw new Error("unsupported_content_type");
}
