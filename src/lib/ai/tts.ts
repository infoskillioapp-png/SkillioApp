import "server-only";
import { parseSummaryMarkdown } from "@/lib/notes/summary-markdown";

// Google Cloud Text-to-Speech vía REST con API key (misma infra que Gemini pero
// key propia AIza — la de Gemini es formato AQ. y NO sirve para TTS). Se eligió
// REST + fetch (no @google-cloud/text-to-speech) para no meter una dependencia
// pesada y no depender de credenciales de service account en Vercel.

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";

// es-AR no tiene voces dedicadas en Google: la cubre con es-US (español latino
// neutro). Neural2 soporta SSML (necesario para las pausas pedagógicas).
export type VoiceGender = "f" | "m";
const VOICE: Record<VoiceGender, string> = {
  f: "es-US-Neural2-A", // femenina
  m: "es-US-Neural2-B", // masculina
};
const LANGUAGE_CODE = "es-US";

// La API corta en 5000 bytes de input por request (SSML incluido). Dejamos
// margen: si un resumen supera esto, se parte en varios requests y se
// concatenan los MP3.
const MAX_SSML_BYTES = 4200;

const bytes = (s: string) => Buffer.byteLength(s, "utf8");

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Markdown → texto plano narrable (saca marcas, viñetas, links, tablas simples).
function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")              // bloques de código
    .replace(/`([^`]+)`/g, "$1")                    // código inline
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")          // imágenes
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")        // links → texto
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")             // ### encabezados internos
    .replace(/^\s*>\s?/gm, "")                       // blockquotes
    .replace(/\*\*([^*]+)\*\*/g, "$1")              // **negrita**
    .replace(/\*([^*]+)\*/g, "$1")                   // *itálica*
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")                   // viñetas
    .replace(/^\s*\d+\.\s+/gm, "")                   // listas numeradas
    .replace(/^\s*\|.*\|\s*$/gm, " ")               // filas de tabla
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Divide un texto largo en oraciones (para partir un párrafo gigante que solo
// no entre en el límite de bytes).
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*\s*/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}

type Piece = { ssml: string }; // fragmento ya escapado, con su pausa incluida

// Construye los fragmentos SSML del resumen con ritmo pedagógico: pausa larga
// tras cada título de sección, pausa media entre párrafos.
function buildPieces(markdown: string, opts: { firstSectionOnly?: boolean }): Piece[] {
  const parsed = parseSummaryMarkdown(markdown);
  const pieces: Piece[] = [];

  const pushParagraphs = (raw: string, breakMs: number) => {
    const clean = stripMarkdown(raw);
    if (!clean) return;
    for (const para of clean.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)) {
      pieces.push({ ssml: `${escapeXml(para)}<break time="${breakMs}ms"/>` });
    }
  };

  if (parsed.title) pieces.push({ ssml: `${escapeXml(parsed.title)}<break time="900ms"/>` });
  if (parsed.intro) pushParagraphs(parsed.intro, 500);

  const sections = opts.firstSectionOnly ? parsed.sections.slice(0, 1) : parsed.sections;
  for (const sec of sections) {
    if (sec.heading) pieces.push({ ssml: `${escapeXml(sec.heading)}.<break time="800ms"/>` });
    pushParagraphs(sec.markdown, 450);
    pieces.push({ ssml: `<break time="700ms"/>` });
  }
  return pieces;
}

// Empaqueta los fragmentos en chunks <speak>…</speak> que no superen el límite
// de bytes. Un fragmento suelto que ya lo supere se parte por oraciones.
function packChunks(pieces: Piece[]): string[] {
  const wrap = (body: string) => `<speak>${body}</speak>`;
  const overhead = bytes(wrap(""));
  const chunks: string[] = [];
  let cur = "";

  const flush = () => { if (cur) { chunks.push(wrap(cur)); cur = ""; } };

  const add = (frag: string) => {
    if (overhead + bytes(cur) + bytes(frag) <= MAX_SSML_BYTES) {
      cur += frag;
      return;
    }
    flush();
    if (overhead + bytes(frag) <= MAX_SSML_BYTES) {
      cur = frag;
      return;
    }
    // Fragmento gigante: partir por oraciones.
    for (const sent of splitSentences(frag.replace(/<break[^>]*>/g, ""))) {
      const sFrag = `${sent} `;
      if (overhead + bytes(cur) + bytes(sFrag) > MAX_SSML_BYTES) flush();
      cur += sFrag;
    }
  };

  for (const p of pieces) add(p.ssml);
  flush();
  return chunks;
}

async function synthesizeChunk(ssml: string, voiceName: string, apiKey: string): Promise<Buffer> {
  const res = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { ssml },
      voice: { languageCode: LANGUAGE_CODE, name: voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.0, pitch: 0 },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`TTS ${res.status}: ${err?.error?.message || "error de síntesis"}`);
  }
  const json = (await res.json()) as { audioContent?: string };
  if (!json.audioContent) throw new Error("TTS: respuesta sin audio");
  return Buffer.from(json.audioContent, "base64");
}

export type SynthResult = { mp3: Buffer; chars: number; chunks: number };

// Sintetiza el resumen completo (markdown) a un único MP3. Devuelve también la
// cantidad de caracteres facturables para medir el costo real.
export async function synthesizeSummary(
  markdown: string,
  gender: VoiceGender,
  opts: { firstSectionOnly?: boolean } = {},
): Promise<SynthResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("Falta GOOGLE_TTS_API_KEY");

  const pieces = buildPieces(markdown, opts);
  const chunks = packChunks(pieces);
  if (chunks.length === 0) throw new Error("Resumen vacío: nada para narrar");

  const voiceName = VOICE[gender];
  const buffers: Buffer[] = [];
  let chars = 0;
  for (const ssml of chunks) {
    chars += ssml.length;
    buffers.push(await synthesizeChunk(ssml, voiceName, apiKey));
  }
  return { mp3: Buffer.concat(buffers), chars, chunks: chunks.length };
}
