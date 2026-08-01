import "server-only";
import { parseSummaryMarkdown } from "@/lib/notes/summary-markdown";

// Google Cloud Text-to-Speech vía REST con API key (misma infra que Gemini pero
// key propia AIza — la de Gemini es formato AQ. y NO sirve para TTS). Se eligió
// REST + fetch (no @google-cloud/text-to-speech) para no meter una dependencia
// pesada y no depender de credenciales de service account en Vercel.
//
// Usamos v1beta1 porque expone `enableTimePointing` con marcas SSML <mark>: la
// MISMA llamada del audio devuelve el tiempo de cada frase → subtítulos tipo
// karaoke SIN costo de generación extra (solo unas marcas mínimas en el texto).

const TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1beta1/text:synthesize";

// es-AR no tiene voces dedicadas en Google: la cubre con es-US (español latino
// neutro). Neural2 soporta SSML y timepoints (verificado en vivo).
export type VoiceGender = "f" | "m";
const VOICE: Record<VoiceGender, string> = {
  f: "es-US-Neural2-A", // femenina
  m: "es-US-Neural2-B", // masculina
};
const LANGUAGE_CODE = "es-US";

// La API corta en 5000 bytes de input por request (SSML incluido). Dejamos
// margen: si un resumen supera esto, se parte en varios requests y se
// concatenan los MP3 (los timepoints se corrigen con el offset acumulado).
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

// Divide un texto en oraciones (unidad de subtítulo). Corta oraciones muy
// largas (>~180 chars) en el borde de una coma para que ninguna unidad pase el
// límite de bytes y el subtítulo no sea un bloque gigante.
function splitSentences(text: string): string[] {
  const raw = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const out: string[] = [];
  for (const s of raw.map((x) => x.trim()).filter(Boolean)) {
    if (bytes(s) <= 180) { out.push(s); continue; }
    let buf = "";
    for (const part of s.split(/,\s*/)) {
      const piece = buf ? `${buf}, ${part}` : part;
      if (bytes(piece) > 180 && buf) { out.push(buf); buf = part; }
      else buf = piece;
    }
    if (buf) out.push(buf);
  }
  return out;
}

// Unidad narrable = una frase/encabezado con su pausa. `text` es el subtítulo.
type Unit = { text: string; breakMs: number };

function extractUnits(markdown: string, opts: { firstSectionOnly?: boolean }): Unit[] {
  const parsed = parseSummaryMarkdown(markdown);
  const units: Unit[] = [];
  const pushText = (raw: string, breakMs: number) => {
    const clean = stripMarkdown(raw);
    if (!clean) return;
    for (const para of clean.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)) {
      const sents = splitSentences(para);
      sents.forEach((s, i) => units.push({ text: s, breakMs: i === sents.length - 1 ? breakMs : 250 }));
    }
  };

  if (parsed.title) units.push({ text: parsed.title, breakMs: 900 });
  if (parsed.intro) pushText(parsed.intro, 500);

  const sections = opts.firstSectionOnly ? parsed.sections.slice(0, 1) : parsed.sections;
  for (const sec of sections) {
    if (sec.heading) units.push({ text: sec.heading, breakMs: 800 });
    pushText(sec.markdown, 650);
  }
  return units;
}

// Empaqueta unidades en chunks <speak> con una <mark> antes de cada una (para el
// timepoint) y un mark "__end" al final (para medir la duración del chunk y
// corregir el offset al concatenar).
type Chunk = { ssml: string; unitIdxs: number[] };
function packChunks(units: Unit[]): Chunk[] {
  const wrap = (body: string) => `<speak>${body}<mark name="__end"/></speak>`;
  const overhead = bytes(wrap(""));
  const chunks: Chunk[] = [];
  let curBody = "";
  let curIdxs: number[] = [];

  const flush = () => {
    if (curIdxs.length) { chunks.push({ ssml: wrap(curBody), unitIdxs: curIdxs }); curBody = ""; curIdxs = []; }
  };

  units.forEach((u, i) => {
    const frag = `<mark name="u${i}"/>${escapeXml(u.text)}<break time="${u.breakMs}ms"/>`;
    if (curIdxs.length && overhead + bytes(curBody) + bytes(frag) > MAX_SSML_BYTES) flush();
    curBody += frag;
    curIdxs.push(i);
  });
  flush();
  return chunks;
}

type Timepoint = { markName?: string; timeSeconds?: number };
async function synthesizeChunk(ssml: string, voiceName: string, apiKey: string): Promise<{ audio: Buffer; timepoints: Timepoint[] }> {
  const res = await fetch(`${TTS_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { ssml },
      voice: { languageCode: LANGUAGE_CODE, name: voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate: 1.0, pitch: 0 },
      enableTimePointing: ["SSML_MARK"],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`TTS ${res.status}: ${err?.error?.message || "error de síntesis"}`);
  }
  const json = (await res.json()) as { audioContent?: string; timepoints?: Timepoint[] };
  if (!json.audioContent) throw new Error("TTS: respuesta sin audio");
  return { audio: Buffer.from(json.audioContent, "base64"), timepoints: json.timepoints ?? [] };
}

// Cue de subtítulo: texto de la frase + segundo en que arranca en el audio final.
export type Cue = { t: number; text: string };
export type SynthResult = { mp3: Buffer; chars: number; chunks: number; cues: Cue[] };

// Sintetiza el resumen completo a un único MP3 + los cues de subtítulos.
export async function synthesizeSummary(
  markdown: string,
  gender: VoiceGender,
  opts: { firstSectionOnly?: boolean } = {},
): Promise<SynthResult> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("Falta GOOGLE_TTS_API_KEY");

  const units = extractUnits(markdown, opts);
  const chunks = packChunks(units);
  if (chunks.length === 0) throw new Error("Resumen vacío: nada para narrar");

  const voiceName = VOICE[gender];
  const buffers: Buffer[] = [];
  const cues: Cue[] = [];
  let chars = 0;
  let offset = 0; // segundos acumulados de los chunks anteriores

  for (const chunk of chunks) {
    chars += chunk.ssml.length;
    const { audio, timepoints } = await synthesizeChunk(chunk.ssml, voiceName, apiKey);
    buffers.push(audio);

    let chunkEnd = 0;
    for (const tp of timepoints) {
      const t = tp.timeSeconds ?? 0;
      if (tp.markName === "__end") { chunkEnd = t; continue; }
      const idx = Number((tp.markName ?? "u0").slice(1));
      const u = units[idx];
      if (u) cues.push({ t: +(offset + t).toFixed(2), text: u.text });
    }
    offset += chunkEnd || 0;
  }

  cues.sort((a, b) => a.t - b.t);
  return { mp3: Buffer.concat(buffers), chars, chunks: chunks.length, cues };
}
