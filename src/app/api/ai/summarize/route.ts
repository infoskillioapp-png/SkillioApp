import { NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { recordAiUsage, checkUsageLimit } from "@/lib/ai/usage";
import { resolveActor } from "@/lib/actor";
import {
  buildUserContent,
  getNoteContent,
  isFreeGenerationAllowed,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
  saveAiOutput,
} from "@/lib/ai/claude";
import { genSummaryPuntos, SUMMARY_SYSTEM } from "@/lib/ai/suite";

export const maxDuration = 300;

// ===========================================================================
// SCHEMAS de los formatos SECUNDARIOS (mapa, ficha). puntos_clave vive en
// @/lib/ai/suite (fuente única, compartido con /api/ai/generate-suite).
// ===========================================================================
const MapaSchema = z.object({
  title: z.string().describe("Título del mapa conceptual"),
  outline: z
    .string()
    .describe(
      "Outline del mapa en MARKDOWN JERARQUICO. Usá # para la raíz (una sola línea), ## para ramas principales, ### para sub-ramas, y - para hojas. Ejemplo:\n# Tema central\n## Rama A\n### Sub-concepto\n- detalle 1\n- detalle 2\n## Rama B\n- detalle",
    ),
});

const FichaSectionSchema = z.object({
  heading: z
    .string()
    .describe(
      "Encabezado de la sección (ej: 'Definiciones clave', 'Fórmulas', 'Ejemplos', 'A recordar')",
    ),
  icon: z.string().describe("Un emoji que represente la sección"),
  items: z
    .array(
      z.object({
        label: z.string().describe("Término, fórmula, o nombre del ejemplo (corto)"),
        detail: z.string().describe("Definición, explicación o detalle (1-2 oraciones)"),
      }),
    )
    .min(2)
    .max(8),
});

const FichaSchema = z.object({
  title: z.string().describe("Título del apunte"),
  topic: z.string().describe("Tema central en 5-10 palabras"),
  sections: z.array(FichaSectionSchema).min(3).max(5),
});

const VALID_FORMATS = new Set(["puntos_clave", "mapa", "ficha", "resumen"]);

// Prompts de los formatos secundarios (puntos_clave usa el de suite.ts).
const FORMAT_PROMPTS: Record<string, string> = {
  mapa: "Generá un mapa conceptual del apunte como markdown jerárquico listo para renderizar con markmap. Usá # para el tema central (una sola línea), ## para 3-5 ramas principales, ### para sub-conceptos, y guiones `-` para hojas. No te excedas de 4 niveles de profundidad. Devolvé SIEMPRE en español rioplatense.",
  ficha: "Armá una ficha de estudio con 3 a 5 secciones temáticas. Cada sección tiene un encabezado claro, un emoji representativo, y 2-6 items con label (término/concepto) y detail (definición). Las secciones sugeridas: Definiciones clave, Conceptos / Fórmulas, Ejemplos, A recordar / errores frecuentes. Devolvé SIEMPRE en español rioplatense.",
  resumen: "Transformá el apunte en un resumen de estudio premium en Markdown. Seguí la estructura requerida al pie de la letra.",
};

const RESUMEN_SYSTEM_PROMPT = `Sos 'Booki', la IA experta en pedagogía universitaria y aprendizaje acelerado de Skilio. Tu objetivo es transformar apuntes complejos, PDFs densos y desgrabados en el mejor resumen de estudio del mundo.

Reglas estrictas de generación:
1. Tono: Profesional pero cercano, empático con el estudiante universitario (hablá en un español de Latinoamérica neutro pero cálido, evitá el 'tú' de España o México).
2. Densidad de información: No omitas datos técnicos, fórmulas, definiciones exactas ni autores clave. Preferís una respuesta larga y rica a recortar contenido importante.
3. Formato: Utilizá Markdown avanzado para que sea visualmente ultra escaneable (tablas, listas con emojis en los bullet points, jerarquía clara con títulos y subtítulos, y negritas en las ideas fuerza).

Estructura requerida para el output (Respetá estrictamente estos módulos en Markdown):

## 💡 El concepto en criollo
[Explicación simple utilizando una analogía de la vida cotidiana para entender el núcleo del tema de forma amigable]

## 🎯 Conceptos 'Saca-Notas' (Glosario Clave)
[Tabla en Markdown o lista con términos técnicos indispensables en negrita + su definición pedagógica masticada]

## 📖 Resumen Ejecutivo de Contenido
[El desarrollo fuerte y estructurado de la materia con jerarquía visual impecable utilizando subtítulos, bloques de código si aplica, y listas tabuladas]

## 🧠 Desafío de Memoria
[Agregá de 3 a 5 preguntas punzantes y analíticas sobre el texto para que el alumno se autoevalúe si realmente fijó el conocimiento]`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const note_id = body.note_id as string;
    const format = (body.format as string) || "puntos_clave";

    if (!note_id)
      return NextResponse.json({ error: "note_id required" }, { status: 400 });
    if (!VALID_FORMATS.has(format))
      return NextResponse.json({ error: "invalid format" }, { status: 400 });

    // Identidad: Clerk (con cuenta) o sesión anónima (registro diferido).
    const actor = await resolveActor();
    const { note, content, userRow } = await getNoteContent(note_id, actor);
    if (content.type === "unsupported")
      return NextResponse.json(
        { error: "tipo de archivo no soportado (subí PDF, imagen o texto)" },
        { status: 415 },
      );

    const isPaid = isPaidPlan(userRow.plan, userRow.expires_at);
    const model = modelForGeneration(userRow.plan, userRow.expires_at, "summarize");

    // FREE: 1 suite de por vida. Segundo intento → paywall.
    if (userRow.plan === "free") {
      const allowed = await isFreeGenerationAllowed(userRow.id);
      if (!allowed) return NextResponse.json({ error: "free_limit_reached" }, { status: 402 });
    }

    if (isPaid) {
      const limitCheck = await checkUsageLimit(userRow.id);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: "usage_limit_reached", reason: limitCheck.reason, resetAt: limitCheck.resetAt },
          { status: 402 },
        );
      }
    }

    let payload: unknown;
    let usage: { inputTokens?: number; outputTokens?: number } | undefined;

    if (format === "puntos_clave") {
      // Fuente única compartida con el endpoint combinado.
      const r = await genSummaryPuntos(content, model, isPaid);
      payload = r.object;
      usage = r.usage;
    } else {
      const userParts = await buildUserContent(content, FORMAT_PROMPTS[format], isPaid);
      if (format === "mapa") {
        const r = await generateObject({ model: anthropic(model), schema: MapaSchema, system: SUMMARY_SYSTEM, messages: [{ role: "user", content: userParts }] });
        payload = r.object;
        usage = r.usage;
      } else if (format === "resumen") {
        const r = await generateText({ model: anthropic(model), system: RESUMEN_SYSTEM_PROMPT, messages: [{ role: "user", content: userParts }], maxOutputTokens: 8000 });
        payload = { text: r.text };
        usage = r.usage;
      } else {
        const r = await generateObject({ model: anthropic(model), schema: FichaSchema, system: SUMMARY_SYSTEM, messages: [{ role: "user", content: userParts }] });
        payload = r.object;
        usage = r.usage;
      }
    }

    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "summary",
      format,
      title: note.title,
      content: { format, data: payload },
      credits_used: 0,
      model,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
    });

    await recordAiUsage({ kind: "summarize", model, usage, userDbId: userRow.id });
    // Activación: primera generación con material propio → evento Meta.
    const activationEventId = await markActivationIfFirst(userRow.id);

    return NextResponse.json({
      ok: true,
      output_id: id,
      format,
      data: payload,
      credits_remaining: 0,
      is_paid: isPaid,
      activation_event_id: activationEventId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/summarize]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
