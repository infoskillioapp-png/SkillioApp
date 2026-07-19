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

// Práctica rápida: se genera JUNTO con el bloque (misma llamada), no en un
// fetch aparte al cambiar de tema — eso multiplicaba el costo por cada click.
const PracticaQuestionSchema = z.object({
  pregunta: z.string(),
  opciones: z.array(z.string()).length(4),
  correcta: z.number().int().min(0).max(3).describe("Índice de la opción correcta (0-3)"),
  explicacion: z.string().describe("Por qué la correcta es correcta, 1 oración"),
});
const PRACTICA_DESCRIPCION =
  "Exactamente 2 preguntas de opción múltiple (4 opciones cada una) que refuercen LITERALMENTE lo que dice este bloque — deben poder responderse con esta misma información, sin inventar casos aplicados nuevos (eso es para el simulacro, no para acá).";

const KeyPointSchemaFree = z.object({
  emoji: z.string().describe("Un emoji que represente bien el concepto"),
  title: z.string().describe("Concepto o idea principal en 3-8 palabras, conciso"),
  description: z.string().describe("Explicación DESARROLLADA de 4 a 6 oraciones: definí la idea, explicá el porqué y sumá un ejemplo o consecuencia. Nunca una sola frase suelta."),
  category: z.string().optional().describe("Subtema dentro del apunte"),
  practica: z.array(PracticaQuestionSchema).length(2).describe(PRACTICA_DESCRIPCION),
});

export const PuntosClaveSchemaFree = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z.string().optional().describe("Una oración de contexto al inicio (opcional)"),
  points: z.array(KeyPointSchemaFree).min(2).max(2),
});

export const SUMMARY_SYSTEM =
  "Sos un asistente de estudio en español rioplatense. Generás material claro, organizado y atractivo para que un estudiante universitario pueda repasar. Nunca inventes información que no esté en el apunte. Si el apunte no contiene material académico relevante, decílo en la descripción. Sé conciso pero completo.";

// FREE: solo llegan las primeras 5 páginas → 2 puntos MUY bien desarrollados.
export const PUNTOS_PROMPT_FREE =
  "Extraé EXACTAMENTE 2 puntos clave: los 2 conceptos MÁS importantes de este material. Cada punto debe tener una descripción DESARROLLADA y con sustancia (4 a 6 oraciones: definí la idea, explicá por qué importa y sumá un ejemplo o una consecuencia concreta). Nada de frases sueltas de una línea. Asigná un emoji representativo y un título de 3-8 palabras. Para cada punto, generá también su práctica rápida (2 preguntas de refuerzo literal). Devolvé SIEMPRE en español rioplatense.";

// ---------------------------------------------------------------------------
// RESUMEN PRO · bloques pedagógicos dinámicos (reemplaza "texto + lista fija").
// La IA elige, por bloque, el formato que mejor comunique ESE contenido —
// no todo tiene que ser un párrafo con viñetas debajo.
// ---------------------------------------------------------------------------
const TextoBlockSchema = z.object({
  type: z.literal("texto"),
  emoji: z.string().describe("Un emoji que represente el concepto"),
  title: z.string().describe("Título corto del tema, 3-8 palabras"),
  category: z.string().optional().describe("Subtema al que pertenece (mismo string para bloques del mismo subtema)"),
  body: z.string().describe(
    "Explicación desarrollada en Markdown (podés usar **negrita**, listas con '-'). Mínimo 4-6 oraciones. Preservá ejemplos, historias y analogías potentes del original — no las recortes.",
  ),
  practica: z.array(PracticaQuestionSchema).length(2).describe(PRACTICA_DESCRIPCION),
});

const ProcesoBlockSchema = z.object({
  type: z.literal("proceso"),
  emoji: z.string(),
  title: z.string(),
  category: z.string().optional(),
  intro: z.string().optional().describe("1 oración de contexto antes de los pasos"),
  pasos: z
    .array(
      z.object({
        paso: z.string().describe("Nombre corto del paso"),
        detalle: z.string().describe("Explicación del paso, 1-3 oraciones"),
      }),
    )
    .min(2)
    .max(8),
  practica: z.array(PracticaQuestionSchema).length(2).describe(PRACTICA_DESCRIPCION),
});

const TablaBlockSchema = z.object({
  type: z.literal("tabla"),
  emoji: z.string(),
  title: z.string(),
  category: z.string().optional(),
  intro: z.string().optional(),
  columnas: z.array(z.string()).min(2).max(5).describe("Encabezados de columna"),
  filas: z
    .array(
      z.object({
        etiqueta: z.string().describe("Nombre de la fila (primera columna)"),
        valores: z.array(z.string()).describe("Un valor por cada columna restante, en el mismo orden que `columnas`"),
      }),
    )
    .min(2)
    .max(8),
  practica: z.array(PracticaQuestionSchema).length(2).describe(PRACTICA_DESCRIPCION),
});

const FrameworkBlockSchema = z.object({
  type: z.literal("framework"),
  emoji: z.string(),
  title: z.string(),
  category: z.string().optional(),
  intro: z.string().optional().describe("Qué es el framework en 1 oración"),
  elementos: z
    .array(
      z.object({
        nombre: z.string(),
        descripcion: z.string().describe("1-2 oraciones"),
      }),
    )
    .min(2)
    .max(6),
  practica: z.array(PracticaQuestionSchema).length(2).describe(PRACTICA_DESCRIPCION),
});

const AnalogiaBlockSchema = z.object({
  type: z.literal("analogia"),
  emoji: z.string(),
  title: z.string(),
  category: z.string().optional(),
  analogia: z.string().describe(
    "La historia, ejemplo real o analogía del original, desarrollada con detalle — no la resumas al mínimo, esto es lo que fija el concepto en la memoria del estudiante.",
  ),
  conexion: z.string().describe("1-2 oraciones conectando la analogía con el concepto académico que ilustra"),
  practica: z.array(PracticaQuestionSchema).length(2).describe(PRACTICA_DESCRIPCION),
});

const SummaryBlockSchema = z.discriminatedUnion("type", [
  TextoBlockSchema,
  ProcesoBlockSchema,
  TablaBlockSchema,
  FrameworkBlockSchema,
  AnalogiaBlockSchema,
]);

export const PuntosClaveSchemaPro = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z.string().optional().describe("Una oración de contexto al inicio (opcional)"),
  points: z.array(SummaryBlockSchema).min(6).max(12),
});

export const SUMMARY_SYSTEM_PRO = `Sos un Diseñador Instruccional y Profesor Universitario experto en técnicas de estudio y neuromemoria. Tu trabajo NO es "resumir" de forma genérica — es transformar el material en una experiencia de estudio que realmente fije el conocimiento. Nunca inventes información que no esté en el apunte.

Reglas estrictas:
1. SEGMENTACIÓN: dividí el apunte en bloques temáticos mutuamente excluyentes, siguiendo el orden lógico del material original. Cada bloque tiene que aportar información 100% nueva — NUNCA repitas un concepto, ejemplo o dato ya cubierto en un bloque anterior. Si dos ideas están muy relacionadas, desarrollalas juntas en un solo bloque en vez de repartirlas en dos.
2. FORMATO ADAPTATIVO: para cada bloque, elegí el "type" que mejor comunique ESE contenido puntual — no fuerces todo al mismo molde:
   - "texto": explicaciones conceptuales o ideas que no encajan en los otros formatos.
   - "proceso": cuando el original describe pasos ordenados, una metodología o una secuencia.
   - "tabla": cuando hay una comparación entre varios elementos con las mismas categorías.
   - "framework": cuando hay un modelo con varios componentes que funcionan juntos (ej: un triángulo de 3 pilares, un modelo de varios niveles).
   - "analogia": cuando el original cuenta una historia, ejemplo real o analogía para explicar un concepto.
3. DENSIDAD: nunca sacrifiques profundidad por brevedad. Los ejemplos, historias y analogías del original son lo que hace que el estudiante recuerde — conservalos con detalle, no los aplanes a una oración.
4. PRÁCTICA: cada bloque lleva sus propias 2 preguntas de refuerzo — deben poder responderse LITERALMENTE con el contenido de ESE bloque, sin inventar casos aplicados nuevos.
5. Español rioplatense, tono cercano pero profesional.`;

export const PUNTOS_PROMPT_PRO =
  "Extraé entre 8 y 12 bloques temáticos del apunte, en el mismo orden en que aparecen en el material original. Cada bloque usa el formato (\"type\") que mejor le quede a su contenido, y trae sus propias 2 preguntas de práctica rápida. Agrupá los bloques por subtema usando `category` (mismo string para bloques del mismo subtema). Devolvé SIEMPRE en español rioplatense.";

export async function genSummaryPuntos(content: NoteContent, model: string, isPaid: boolean) {
  if (isPaid) {
    const parts = await buildUserContent(content, PUNTOS_PROMPT_PRO, isPaid);
    const r = await generateObject({
      model: anthropic(model),
      schema: PuntosClaveSchemaPro,
      system: SUMMARY_SYSTEM_PRO,
      messages: [{ role: "user", content: parts }],
    });
    return { object: r.object, usage: r.usage as Usage, title: r.object.title };
  }
  const parts = await buildUserContent(content, PUNTOS_PROMPT_FREE, isPaid);
  const r = await generateObject({
    model: anthropic(model),
    schema: PuntosClaveSchemaFree,
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
