import "server-only";
import * as Sentry from "@sentry/nextjs";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { buildUserContent, type NoteContent } from "@/lib/ai/claude";
import { parseSummaryMarkdown } from "@/lib/notes/summary-markdown";

// =============================================================================
// Fuente ÚNICA de los prompts y generadores de la "suite" de estudio
// (resumen markdown, flashcards, simulacro). Lo usan tanto los endpoints
// individuales (/api/ai/*) como el endpoint combinado (/api/ai/generate-suite),
// que prepara el apunte UNA sola vez y dispara las generaciones en paralelo.
//
// PROVEEDOR: Gemini (Google). Migramos desde Anthropic por costo (~50% menos).
// Flashcards y simulacro necesitan salida estructurada: Gemini NO soporta el
// modo estricto (rechaza las uniones discriminadas de nuestros schemas), así
// que usamos generateText pidiendo JSON por prompt + validación nuestra con Zod
// (generateStructured, abajo). El resumen NO usa schema: es Markdown libre.
// =============================================================================

type Usage = { inputTokens?: number; outputTokens?: number } | undefined;
type Content = Awaited<ReturnType<typeof buildUserContent>>;

const google = createGoogleGenerativeAI(); // lee GOOGLE_GENERATIVE_AI_API_KEY

// Salida grande sin truncar: el resumen/simulacro pueden pasar varios miles de
// tokens y, si el modelo corta a la mitad, queda inválido. 16k da aire de sobra.
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
// RESUMEN · Markdown
// ---------------------------------------------------------------------------
// El resumen es un documento Markdown (un "apunte" para estudiar), NO un JSON
// de bloques. Motivo del cambio: el JSON estructurado (a) inflaba el output ~8x
// → costo, (b) le partía la atención al modelo entre "contenido" y "encajar en
// el schema" → resúmenes más pobres y con ruido promocional. En texto libre el
// modelo se concentra en el contenido: sale más denso, filtra mejor lo comercial
// y es ~40% más barato. Lo renderiza react-markdown en el front y @react-pdf en
// la descarga. Sin práctica embebida — el refuerzo lo cubre el Simulacro.

// Sistema de estudio genérico (lo comparten mapa/ficha en /api/ai/summarize).
export const SUMMARY_SYSTEM =
  "Sos un asistente de estudio en español rioplatense. Generás material claro, organizado y atractivo para que un estudiante universitario pueda repasar. Nunca inventes información que no esté en el apunte. Si el apunte no contiene material académico relevante, decílo en la descripción. Sé conciso pero completo.";

// Prompt estricto para Lite (gemini-3.5-flash-lite): fuerza cobertura total,
// rastreo anti-omisión (Lite tiende a dejar ítems de listas afuera) y fórmulas
// exactas en LaTeX (se renderizan con KaTeX en el front). Estructura en 2-4
// PARTES (## nombradas por la IA), cada una con sus temas (###). El parser usa
// los '## ' como los macro-bloques navegables.
export const SUMMARY_MD_SYSTEM = `Sos un Profesor Universitario y Diseñador Instruccional experto. Convertís el material en un RESUMEN DE ESTUDIO en Markdown: el apunte completo y confiable con el que un alumno estudia para el examen. Es un trabajo de PRECISIÓN: no podés saltearte temas ni inventar nada que no esté en el material.

REGLAS DE CONTENIDO (obligatorias):
1. COBERTURA TOTAL: recorré el material de principio a fin y cubrí TODOS los temas, en el mismo orden. Prohibido saltear una sección, un concepto o un ejemplo importante.
2. REGLA DE RASTREO (crítica): antes de redactar, identificá los elementos enumerables del texto. Si el material contiene listas o clasificaciones (ej: "los 5 niveles", "las 3 etapas"), casos reales (marcas, empresas, personas), autores, leyes, fechas o fórmulas, es OBLIGATORIO incluirlos TODOS, uno por uno, sin omitir ninguno. Si el texto dice que son 5, tu resumen tiene los 5.
3. FIDELIDAD ABSOLUTA: usá SOLO lo que dice el material. No agregues información, no completes pasos que el texto no da, no saques conclusiones propias. Si el texto explica algo en pasos, respetá esos pasos exactos.
4. FÓRMULAS Y DATOS EXACTOS: transcribí fórmulas, ecuaciones, definiciones y valores COMPLETOS y EXACTOS, sin simplificar ni redondear. Escribí las fórmulas en notación LaTeX: entre signos $ para fórmulas dentro de una línea (ej: $VAN$) y entre $$ ... $$ para fórmulas en su propia línea (ej: $$VAN = \\sum_{t=1}^{n} \\frac{FC_t}{(1+i)^t} - I_0$$). Definí cada variable justo debajo.
5. CLARIDAD SIN RELLENO: desarrollá bien cada tema, claro y completo. No repitas un concepto o ejemplo ya dicho, ni metas frases vacías de transición (tipo "en esta sección veremos…"). Pero NO recortes contenido: si un tema tiene varias ideas y ejemplos, van TODOS. Conservá los ejemplos, casos y analogías que fijan el concepto (nombralos: la marca, el caso, el dato).
6. NADA DE RUIDO: ignorá lo comercial y meta (ofertas de cursos, precios del autor, "suscribite", bienvenidas/despedidas, llamados a la acción).

ESTRUCTURA Y FORMATO (Markdown estricto):
- Primera línea: el título general del resumen con un solo '# ' (H1).
- Organizá TODO el contenido en 2 a 4 PARTES temáticas grandes, agrupando los temas relacionados. Cada PARTE lleva un título propio, claro y descriptivo con '## '. Apuntá a entre 2 y 4 partes: ni una sola gigante ni muchas chiquitas.
- Dentro de cada parte, cada tema puntual va con '### '.
- '**negrita**' en términos y conceptos clave.
- Listas con '- '.
- TABLAS (importante, no lo omitas): siempre que el material tenga una clasificación, tipología o comparación de 3 o más elementos que compartan las mismas dimensiones (ej: tipos de X, niveles, categorías con su definición y ejemplo, ventajas/desventajas), presentalo OBLIGATORIAMENTE como una TABLA de Markdown (con | y una fila de encabezados), NO como lista. Las tablas hacen el resumen mucho más claro y estudiable — usá al menos una si el contenido lo permite.
- Las fórmulas matemáticas van en LaTeX ($ o $$) como indica la regla 4.
- PROHIBIDO: bloques de código / triple-backtick y diagramas ASCII.
- No escribas nada antes del '# ' ni después del final. Solo el Markdown.

Antes de terminar verificá: ¿cubrí TODOS los temas y TODOS los elementos de cada lista/clasificación? ¿los agrupé en 2-4 partes con nombre propio? ¿transcribí las fórmulas completas? ¿no inventé nada? Español rioplatense, claro y profesional.`;

const SUMMARY_MD_INSTRUCTION_PRO =
  "Generá el resumen de estudio COMPLETO en Markdown siguiendo TODAS las reglas. Cubrí todos los temas del material, con todos los elementos de cada lista y todos los casos/ejemplos, agrupados en 2 a 4 partes.";
const SUMMARY_MD_INSTRUCTION_FREE =
  "Generá un resumen de estudio en Markdown con los conceptos esenciales de este material, siguiendo TODAS las reglas (cobertura, rastreo, formato y estructura en 2 a 4 partes).";

// Saca el título del primer H1 del markdown; "" si no hay.
function extractMdTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "";
}

// Limpia fences de código que el modelo a veces pone alrededor de TODO el doc.
function stripFences(s: string): string {
  return s.replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

// Genera el resumen como Markdown. Reintenta una vez si sale vacío o sin H1.
export async function genSummaryMarkdown(content: NoteContent, model: string, isPaid: boolean) {
  const instruction = isPaid ? SUMMARY_MD_INSTRUCTION_PRO : SUMMARY_MD_INSTRUCTION_FREE;
  const parts = await buildUserContent(content, instruction, isPaid);
  let lastErr: unknown;
  for (let att = 1; att <= 2; att++) {
    try {
      const r = await generateText({
        model: google(model),
        system: SUMMARY_MD_SYSTEM,
        messages: [{ role: "user", content: parts as never }],
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      const markdown = stripFences(r.text);
      // No alcanza con "hay texto y hay un H1": el modelo a veces devuelve los
      // encabezados ('## Parte') sin desarrollar el contenido de abajo — pasaba
      // el chequeo viejo (>50 chars total) y el usuario veía el tema vacío.
      // Exigimos que al menos una sección tenga contenido real.
      const hasHeader = markdown.length > 50 && /^#\s/m.test(markdown);
      const hasRealContent = hasHeader && parseSummaryMarkdown(markdown).sections.some((s) => s.markdown.trim().length > 40);
      if (hasRealContent) {
        return { markdown, usage: r.usage as Usage, title: extractMdTitle(markdown) };
      }
      lastErr = new Error(hasHeader ? "resumen con encabezados pero sin contenido en las secciones" : "resumen markdown vacío o sin encabezado");
    } catch (e) {
      lastErr = e;
    }
    Sentry.captureException(lastErr, { tags: { ai_gen: "summary_md", attempt: String(att) } });
  }
  throw lastErr;
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
