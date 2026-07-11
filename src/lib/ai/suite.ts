import "server-only";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { buildUserContent, type NoteContent } from "@/lib/ai/claude";

// =============================================================================
// Fuente ÚNICA de los schemas, prompts y generadores de la "suite" de estudio
// (resumen puntos_clave, flashcards, simulacro). Lo usan tanto los endpoints
// individuales (/api/ai/*) como el endpoint combinado (/api/ai/generate-suite),
// que prepara el apunte UNA sola vez y dispara las 3 en paralelo.
// =============================================================================

type Usage = { inputTokens?: number; outputTokens?: number } | undefined;

// ---------------------------------------------------------------------------
// RESUMEN · puntos_clave
// ---------------------------------------------------------------------------
const KeyPointSchema = z.object({
  emoji: z.string().describe("Un emoji que represente bien el concepto"),
  title: z.string().describe("Concepto o idea principal en 3-8 palabras, conciso"),
  description: z.string().describe("Explicación clara en 1 o 2 oraciones, autocontenida"),
  category: z.string().optional().describe("Subtema dentro del apunte (mismo string para puntos del mismo subtema)."),
});

const KeyPointSchemaFree = z.object({
  emoji: z.string().describe("Un emoji que represente bien el concepto"),
  title: z.string().describe("Concepto o idea principal en 3-8 palabras, conciso"),
  description: z.string().describe("Explicación DESARROLLADA de 4 a 6 oraciones: definí la idea, explicá el porqué y sumá un ejemplo o consecuencia. Nunca una sola frase suelta."),
  category: z.string().optional().describe("Subtema dentro del apunte"),
});

export const PuntosClaveSchema = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z.string().optional().describe("Una oración de contexto al inicio (opcional)"),
  points: z.array(KeyPointSchema).min(6).max(12),
});

export const PuntosClaveSchemaFree = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z.string().optional().describe("Una oración de contexto al inicio (opcional)"),
  points: z.array(KeyPointSchemaFree).min(2).max(2),
});

export const SUMMARY_SYSTEM =
  "Sos un asistente de estudio en español rioplatense. Generás material claro, organizado y atractivo para que un estudiante universitario pueda repasar. Nunca inventes información que no esté en el apunte. Si el apunte no contiene material académico relevante, decílo en la descripción. Sé conciso pero completo.";

export const PUNTOS_PROMPT =
  "Extraé entre 8 y 12 puntos clave del apunte. Cada punto debe ser una idea autocontenida que un estudiante pueda repasar individualmente. Asigná un emoji que represente el concepto, un título corto (3-8 palabras) y una descripción de 1-2 oraciones. Agrupá los puntos por subtema usando `category` cuando tenga sentido. Devolvé SIEMPRE en español rioplatense.";

// FREE: solo llegan las primeras 5 páginas → 2 puntos MUY bien desarrollados.
export const PUNTOS_PROMPT_FREE =
  "Extraé EXACTAMENTE 2 puntos clave: los 2 conceptos MÁS importantes de este material. Cada punto debe tener una descripción DESARROLLADA y con sustancia (4 a 6 oraciones: definí la idea, explicá por qué importa y sumá un ejemplo o una consecuencia concreta). Nada de frases sueltas de una línea. Asigná un emoji representativo y un título de 3-8 palabras. Devolvé SIEMPRE en español rioplatense.";

export async function genSummaryPuntos(content: NoteContent, model: string, isPaid: boolean) {
  const instruction = isPaid ? PUNTOS_PROMPT : PUNTOS_PROMPT_FREE;
  const parts = await buildUserContent(content, instruction, isPaid);
  const r = await generateObject({
    model: anthropic(model),
    schema: isPaid ? PuntosClaveSchema : PuntosClaveSchemaFree,
    system: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: parts }],
  });
  return { object: r.object, usage: r.usage as Usage, title: r.object.title };
}

// ---------------------------------------------------------------------------
// FLASHCARDS
// ---------------------------------------------------------------------------
const Flashcard = z.object({
  front: z.string().describe("Pregunta o concepto en el frente de la tarjeta"),
  back: z.string().describe("Respuesta clara y completa, en una o dos oraciones"),
  category: z.string().optional().describe("Subtema o categoría dentro del apunte"),
});

export const FlashcardsSchema = z.object({
  deck_title: z.string().describe("Título corto descriptivo del mazo basado en el apunte"),
  cards: z.array(Flashcard).min(3).max(15),
});

export const FLASH_SYSTEM =
  "Sos un asistente de estudio en español rioplatense que arma mazos de flashcards para repetición espaciada. Para cada concepto importante creás una tarjeta con una pregunta clara al frente y una respuesta concisa al dorso. Las preguntas deben ser activas (no 'qué es X' sino 'cuál es la diferencia entre X e Y', 'cuándo se aplica X', 'qué pasa si...'). Nunca inventes información que no esté en el apunte.";

export const FLASH_PROMPT_FREE =
  "Generá exactamente 4 flashcards de muestra sobre los conceptos más importantes de este apunte. Agrupalos por subtema en `category`. Devolvé SIEMPRE en español.";

export const FLASH_PROMPT_PRO =
  "Generá exactamente 15 flashcards de alta calidad a partir de este apunte. Cubrí todos los conceptos centrales y agrupalos por subtema en `category`. Devolvé SIEMPRE en español.";

export async function genFlashcards(content: NoteContent, model: string, isPaid: boolean) {
  const instruction = isPaid ? FLASH_PROMPT_PRO : FLASH_PROMPT_FREE;
  const parts = await buildUserContent(content, instruction, isPaid);
  const r = await generateObject({
    model: anthropic(model),
    schema: FlashcardsSchema,
    system: FLASH_SYSTEM,
    messages: [{ role: "user", content: parts }],
  });
  return { object: r.object, usage: r.usage as Usage, title: r.object.deck_title };
}

// ---------------------------------------------------------------------------
// SIMULACRO
// ---------------------------------------------------------------------------
const MultipleChoice = z.object({
  kind: z.literal("multiple_choice"),
  question: z.string(),
  options: z.array(z.string()).length(4).describe("Exactamente 4 opciones"),
  correct: z.number().int().min(0).max(3).describe("Índice de la opción correcta (0-3)"),
  explanation: z.string(),
});
const TrueFalse = z.object({
  kind: z.literal("true_false"),
  question: z.string(),
  correct: z.boolean(),
  explanation: z.string(),
});
const ShortAnswer = z.object({
  kind: z.literal("short_answer"),
  question: z.string(),
  correct: z.string().describe("Respuesta esperada en una o dos oraciones"),
  explanation: z.string(),
});

export const SimulacroSchema = z.object({
  title: z.string().describe("Título del simulacro basado en el contenido del apunte"),
  questions: z.array(z.discriminatedUnion("kind", [MultipleChoice, TrueFalse, ShortAnswer])).min(3).max(20),
});

export const SIM_SYSTEM =
  "Sos un docente universitario que arma simulacros de examen en español rioplatense. Generás exámenes mixtos con preguntas de opción múltiple, verdadero/falso y desarrollo corto. Las preguntas deben evaluar comprensión y aplicación (no solo memorización). Las opciones de multiple choice deben tener exactamente 4 alternativas plausibles. Las explicaciones tienen que justificar por qué la respuesta es correcta y por qué las otras son incorrectas. Nunca inventes información que no esté en el apunte.";

export const SIM_PROMPT_FREE =
  "Armá exactamente 4 preguntas de muestra sobre los conceptos principales de este apunte. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer). Devolvé SIEMPRE en español.";

export const SIM_PROMPT_PRO =
  "Armá un simulacro completo de 20 preguntas sobre este apunte. Cubrí la mayor cantidad de temas y subtemas posible. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer), con predominio de multiple_choice. Devolvé SIEMPRE en español.";

export async function genSimulacro(content: NoteContent, model: string, isPaid: boolean) {
  const instruction = isPaid ? SIM_PROMPT_PRO : SIM_PROMPT_FREE;
  const parts = await buildUserContent(content, instruction, isPaid);
  const r = await generateObject({
    model: anthropic(model),
    schema: SimulacroSchema,
    system: SIM_SYSTEM,
    messages: [{ role: "user", content: parts }],
  });
  return { object: r.object, usage: r.usage as Usage, title: r.object.title };
}
