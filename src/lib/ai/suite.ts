import "server-only";
import * as Sentry from "@sentry/nextjs";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { buildUserContent, type NoteContent } from "@/lib/ai/claude";

// =============================================================================
// Fuente ÚNICA de los schemas, prompts y generadores de la "suite" de estudio
// (resumen puntos_clave, flashcards, simulacro). Lo usan tanto los endpoints
// individuales (/api/ai/*) como el endpoint combinado (/api/ai/generate-suite),
// que prepara el apunte UNA sola vez y dispara las 3 en paralelo.
//
// PROVEEDOR: Gemini (Google). Migramos desde Anthropic por costo (~50% menos).
// Gemini NO soporta el modo de "salida estructurada estricta" (su API rechaza
// las uniones discriminadas de nuestros schemas), así que en vez de
// generateObject usamos generateText pidiendo JSON por prompt + validación
// nuestra con Zod (generateStructured, abajo). El schema Zod queda como
// contrato de validación de NUESTRO lado, no se le pasa a la API de Google.
// =============================================================================

type Usage = { inputTokens?: number; outputTokens?: number } | undefined;
type Content = Awaited<ReturnType<typeof buildUserContent>>;

const google = createGoogleGenerativeAI(); // lee GOOGLE_GENERATIVE_AI_API_KEY

// Salida grande sin truncar: el resumen puede pasar 8k tokens y, si el modelo
// corta el JSON a la mitad, queda inválido. 16k le da aire de sobra.
const MAX_OUTPUT_TOKENS = 16000;

// Recupera el objeto de un texto que "debería" ser JSON: primero parse directo,
// después jsonrepair (arregla comillas/llaves faltantes por un corte). null si
// no hay forma.
function robustParse(raw: string): unknown {
  const t = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* sigue */ }
  try { return JSON.parse(jsonrepair(t)); } catch { /* sigue */ }
  return null;
}

// Genera salida estructurada con Gemini de forma robusta: pide JSON por prompt,
// lo parsea (con reparación), lo valida con el schema Zod, y reintenta hasta 3
// veces. Un fallo inicial (~40% por truncado, ya mitigado con MAX_OUTPUT_TOKENS)
// baja a ~6% en el 2º intento y ~1% en el 3º. Cada fallo va a Sentry.
async function generateStructured<T>(opts: {
  label: string;
  model: string;
  schema: z.ZodType<T>;
  system: string;
  content: Content;
}): Promise<{ object: T; usage: Usage }> {
  let lastErr: unknown;
  for (let att = 1; att <= 3; att++) {
    try {
      const r = await generateText({
        model: google(opts.model),
        system: opts.system,
        messages: [{ role: "user", content: opts.content as never }],
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        providerOptions: { google: { responseMimeType: "application/json" } },
      });
      const parsed = robustParse(r.text);
      if (parsed === null) {
        lastErr = new Error("respuesta no parseable como JSON");
      } else {
        const v = opts.schema.safeParse(parsed);
        if (v.success) return { object: v.data, usage: r.usage as Usage };
        lastErr = new Error("no pasó el schema: " + (v.error.issues[0]?.message ?? "?"));
      }
    } catch (e) {
      lastErr = e;
    }
    Sentry.captureException(lastErr, { tags: { ai_gen: opts.label, attempt: String(att) } });
  }
  throw lastErr;
}

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
  category: z.string().optional().describe("Título/sección al que pertenece (mismo string EXACTO para bloques de la misma sección)"),
  body: z.string().describe(
    "Explicación desarrollada en Markdown (podés usar **negrita**, listas con '-'). Mínimo 4-6 oraciones. Preservá ejemplos, historias y analogías potentes del original — no las recortes.",
  ),
});

const ProcesoBlockSchema = z.object({
  type: z.literal("proceso"),
  emoji: z.string(),
  title: z.string(),
  category: z.string().optional(),
  intro: z.string().optional().describe("1 oración de contexto antes de los ítems"),
  ordenado: z.boolean().describe(
    "true SOLO si estos ítems deben pasar en este orden exacto (una metodología, un proceso secuencial, pasos de un flujo). false si es una lista de ítems, características o beneficios SIN orden inherente (ahí no se numeran, van con viñetas).",
  ),
  pasos: z
    .array(
      z.object({
        paso: z.string().describe("Nombre corto del ítem o paso"),
        detalle: z.string().describe("Explicación del ítem, 1-3 oraciones"),
      }),
    )
    .min(2)
    .max(8),
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
});

const SummaryBlockSchema = z.discriminatedUnion("type", [
  TextoBlockSchema,
  ProcesoBlockSchema,
  TablaBlockSchema,
  FrameworkBlockSchema,
  AnalogiaBlockSchema,
]);

// Práctica por TÍTULO (categoría), no por cada bloque/subtítulo — una sola
// tanda de 2 preguntas que cubra ese título completo (puede tener varios
// bloques adentro). El front la muestra recién en el último subtítulo del
// título, como cierre de esa sección.
const PracticaPorTituloSchema = z.object({
  categoria: z.string().describe("Debe coincidir EXACTAMENTE con el `category` usado en los bloques de ese título"),
  practica: z.array(PracticaQuestionSchema).length(2).describe(
    "2 preguntas que refuercen literalmente el contenido de TODOS los bloques de este título combinados (no de uno solo).",
  ),
});

export const PuntosClaveSchemaPro = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z.string().optional().describe("Una oración de contexto al inicio (opcional)"),
  // Sin rango fijo: la cantidad de bloques depende del contenido real del
  // apunte (páginas, densidad), no de un número forzado. El tope de arriba es
  // solo una red de seguridad técnica, no una meta a alcanzar.
  points: z.array(SummaryBlockSchema).min(1).max(40),
  practicaPorTitulo: z.array(PracticaPorTituloSchema).describe(
    "Una entrada por cada título/categoría DISTINTO usado en `points` — no por cada bloque individual.",
  ),
});

export const SUMMARY_SYSTEM_PRO = `Sos un Diseñador Instruccional y Profesor Universitario experto en técnicas de estudio y neuromemoria. Tu trabajo NO es "resumir" de forma genérica — es transformar el material en una experiencia de estudio que realmente fije el conocimiento. Nunca inventes información que no esté en el apunte.

Reglas estrictas:
1. SEGMENTACIÓN: dividí el apunte en bloques temáticos mutuamente excluyentes, siguiendo el orden lógico del material original. Cada bloque tiene que aportar información 100% nueva — NUNCA repitas un concepto, ejemplo o dato ya cubierto en un bloque anterior. Si dos ideas están muy relacionadas, desarrollalas juntas en un solo bloque en vez de repartirlas en dos.
2. CANTIDAD LIBRE: no hay un número fijo de bloques a alcanzar. Generá tantos como el contenido real amerite — un apunte corto y denso puede necesitar solo 3-4 bloques; uno largo, 20 o más. La cantidad la decide el contenido, no una meta arbitraria.
3. FORMATO ADAPTATIVO: para cada bloque, elegí el "type" que mejor comunique ESE contenido puntual — no fuerces todo al mismo molde:
   - "texto": explicaciones conceptuales o ideas que no encajan en los otros formatos.
   - "proceso": una lista de ítems — pasos de una metodología (marcá "ordenado: true") O una lista de características/beneficios sin secuencia (marcá "ordenado: false").
   - "tabla": cuando hay una comparación entre varios elementos con las mismas categorías.
   - "framework": cuando hay un modelo con varios componentes que funcionan juntos (ej: un triángulo de 3 pilares, un modelo de varios niveles).
   - "analogia": cuando el original cuenta una historia, ejemplo real o analogía para explicar un concepto.
4. DENSIDAD: nunca sacrifiques profundidad por brevedad. Los ejemplos, historias y analogías del original son lo que hace que el estudiante recuerde — conservalos con detalle, no los aplanes a una oración.
5. PRÁCTICA POR TÍTULO: la práctica de refuerzo va UNA VEZ por título/categoría (no por cada bloque) — 2 preguntas que cubran todos los bloques de ese título combinados, en "practicaPorTitulo".
6. Español rioplatense, tono cercano pero profesional.

FORMATO DE SALIDA — devolvé EXCLUSIVAMENTE un objeto JSON válido (sin markdown, sin texto antes ni después):
{
  "title": "título corto del apunte",
  "intro": "una oración de contexto (opcional, podés omitir la clave)",
  "points": [ ...bloques... ],
  "practicaPorTitulo": [ { "categoria": "<mismo string EXACTO que el category de sus bloques>", "practica": [ <pregunta>, <pregunta> ] } ]
}
Cada bloque de "points" es UNO de estos 5 tipos (elegí el que mejor comunique ESE contenido):
- {"type":"texto","emoji":"📌","title":"3-8 palabras","category":"...","body":"markdown desarrollado, 4-6 oraciones"}
- {"type":"proceso","emoji":"...","title":"...","category":"...","intro":"opcional","ordenado":true,"pasos":[{"paso":"...","detalle":"..."}]}  (pasos: 2 a 8)
- {"type":"tabla","emoji":"...","title":"...","category":"...","intro":"opcional","columnas":["c1","c2"],"filas":[{"etiqueta":"...","valores":["v1","v2"]}]}  (columnas: 2 a 5; filas: 2 a 8; un valor por columna)
- {"type":"framework","emoji":"...","title":"...","category":"...","intro":"opcional","elementos":[{"nombre":"...","descripcion":"1-2 oraciones"}]}  (elementos: 2 a 6)
- {"type":"analogia","emoji":"...","title":"...","category":"...","analogia":"la historia/ejemplo con detalle","conexion":"1-2 oraciones: qué concepto ilustra"}
Cada <pregunta>: {"pregunta":"...","opciones":["a","b","c","d"],"correcta":0,"explicacion":"por qué la correcta lo es, 1 oración"}  (opciones: EXACTAMENTE 4; correcta: índice 0-3)`;

export const PUNTOS_PROMPT_PRO =
  "Extraé los bloques temáticos que el apunte amerite (ni más ni menos — la cantidad depende del contenido real, no de un número fijo), en el mismo orden en que aparecen en el material original. Cada bloque usa el formato (\"type\") que mejor le quede a su contenido. Agrupá los bloques por título usando `category` (mismo string EXACTO para bloques del mismo título). Para cada título distinto, generá además su propia práctica rápida en `practicaPorTitulo` (2 preguntas que cubran todo ese título, no cada bloque). Devolvé SIEMPRE en español rioplatense.";

// Formato JSON para el resumen FREE (2 puntos simples con práctica embebida).
const SUMMARY_SYSTEM_FREE_JSON = `${SUMMARY_SYSTEM}

FORMATO DE SALIDA — devolvé EXCLUSIVAMENTE un objeto JSON válido (sin markdown):
{
  "title": "título corto",
  "intro": "oración de contexto (opcional)",
  "points": [ EXACTAMENTE 2 objetos con esta forma:
    {"emoji":"📌","title":"3-8 palabras","description":"4-6 oraciones desarrolladas","category":"subtema","practica":[<pregunta>,<pregunta>]}
  ]
}
Cada <pregunta>: {"pregunta":"...","opciones":["a","b","c","d"],"correcta":0,"explicacion":"..."}  (opciones: EXACTAMENTE 4; correcta: índice 0-3)`;

export async function genSummaryPuntos(content: NoteContent, model: string, isPaid: boolean) {
  if (isPaid) {
    const parts = await buildUserContent(content, PUNTOS_PROMPT_PRO, isPaid);
    const r = await generateStructured({
      label: "summary_pro", model, schema: PuntosClaveSchemaPro,
      system: SUMMARY_SYSTEM_PRO, content: parts,
    });
    return { object: r.object, usage: r.usage, title: r.object.title };
  }
  const parts = await buildUserContent(content, PUNTOS_PROMPT_FREE, isPaid);
  const r = await generateStructured({
    label: "summary_free", model, schema: PuntosClaveSchemaFree,
    system: SUMMARY_SYSTEM_FREE_JSON, content: parts,
  });
  return { object: r.object, usage: r.usage, title: r.object.title };
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
  // Margen: el prompt pro pide 15, pero si el modelo genera 16-18 no queremos
  // que Zod rechace el mazo entero — mismo criterio que el simulacro.
  cards: z.array(Flashcard).min(3).max(20),
});

export const FLASH_SYSTEM =
  `Sos un asistente de estudio en español rioplatense que arma mazos de flashcards para repetición espaciada. Para cada concepto importante creás una tarjeta con una pregunta clara al frente y una respuesta concisa al dorso. Las preguntas deben ser activas (no 'qué es X' sino 'cuál es la diferencia entre X e Y', 'cuándo se aplica X', 'qué pasa si...'). Nunca inventes información que no esté en el apunte.

FORMATO DE SALIDA — devolvé EXCLUSIVAMENTE un objeto JSON válido (sin markdown):
{"deck_title":"título corto del mazo","cards":[{"front":"pregunta o concepto","back":"respuesta 1-2 oraciones","category":"subtema"}]}`;

export const FLASH_PROMPT_FREE =
  "Generá exactamente 4 flashcards de muestra sobre los conceptos más importantes de este apunte. Agrupalos por subtema en `category`. Devolvé SIEMPRE en español.";

export const FLASH_PROMPT_PRO =
  "Generá exactamente 15 flashcards de alta calidad a partir de este apunte. Cubrí todos los conceptos centrales y agrupalos por subtema en `category`. Devolvé SIEMPRE en español.";

export async function genFlashcards(content: NoteContent, model: string, isPaid: boolean) {
  const instruction = isPaid ? FLASH_PROMPT_PRO : FLASH_PROMPT_FREE;
  const parts = await buildUserContent(content, instruction, isPaid);
  const r = await generateStructured({
    label: "flashcards", model, schema: FlashcardsSchema,
    system: FLASH_SYSTEM, content: parts,
  });
  return { object: r.object, usage: r.usage, title: r.object.deck_title };
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
  // Tope 25 (no 20) a propósito: el prompt pide 20, pero el modelo a veces
  // genera 21-22 (se pasa por poco). Con el tope pegado al pedido, esas veces
  // Zod rechazaba TODO el simulacro y fallaba la generación entera. El margen
  // deja pasar el desborde en vez de tirar todo. Mismo criterio en flashcards.
  questions: z.array(z.discriminatedUnion("kind", [MultipleChoice, TrueFalse, ShortAnswer])).min(3).max(25),
});

export const SIM_SYSTEM =
  `Sos un docente universitario que arma simulacros de examen en español rioplatense. Generás exámenes mixtos con preguntas de opción múltiple, verdadero/falso y desarrollo corto. Las preguntas deben evaluar comprensión y aplicación (no solo memorización). Las opciones de multiple choice deben tener exactamente 4 alternativas plausibles. Las explicaciones tienen que justificar por qué la respuesta es correcta y por qué las otras son incorrectas. Nunca inventes información que no esté en el apunte.

FORMATO DE SALIDA — devolvé EXCLUSIVAMENTE un objeto JSON válido (sin markdown):
{"title":"título del simulacro","questions":[ ...preguntas... ]}
Cada pregunta es UNA de estas 3 formas:
- {"kind":"multiple_choice","question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}  (options: EXACTAMENTE 4; correct: índice 0-3)
- {"kind":"true_false","question":"...","correct":true,"explanation":"..."}
- {"kind":"short_answer","question":"...","correct":"respuesta 1-2 oraciones","explanation":"..."}`;

export const SIM_PROMPT_FREE =
  "Armá exactamente 4 preguntas de muestra sobre los conceptos principales de este apunte. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer). Devolvé SIEMPRE en español.";

export const SIM_PROMPT_PRO =
  "Armá un simulacro completo de 20 preguntas sobre este apunte. Cubrí la mayor cantidad de temas y subtemas posible. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer), con predominio de multiple_choice. Devolvé SIEMPRE en español.";

export async function genSimulacro(content: NoteContent, model: string, isPaid: boolean) {
  const instruction = isPaid ? SIM_PROMPT_PRO : SIM_PROMPT_FREE;
  const parts = await buildUserContent(content, instruction, isPaid);
  const r = await generateStructured({
    label: "simulacro", model, schema: SimulacroSchema,
    system: SIM_SYSTEM, content: parts,
  });
  return { object: r.object, usage: r.usage, title: r.object.title };
}
