import { NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  buildUserContent,
  chargeCredits,
  getNoteContent,
  isFreeGenerationAllowed,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
  saveAiOutput,
} from "@/lib/ai/claude";

const COST = 28;

// ===========================================================================
// SCHEMAS por formato
// ===========================================================================
const KeyPointSchema = z.object({
  emoji: z.string().describe("Un emoji que represente bien el concepto"),
  title: z.string().describe("Concepto o idea principal en 3-8 palabras, conciso"),
  description: z
    .string()
    .describe("Explicación clara en 1 o 2 oraciones, autocontenida"),
  category: z
    .string()
    .optional()
    .describe(
      "Subtema dentro del apunte (ej: 'Definiciones', 'Aplicación', 'Ejemplo'). Mismo string para puntos del mismo subtema.",
    ),
});

const PuntosClaveSchema = z.object({
  title: z.string().describe("Título corto descriptivo basado en el apunte"),
  intro: z
    .string()
    .optional()
    .describe("Una oración de contexto al inicio (opcional)"),
  points: z.array(KeyPointSchema).min(6).max(12),
});

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
        label: z
          .string()
          .describe("Término, fórmula, o nombre del ejemplo (corto)"),
        detail: z
          .string()
          .describe("Definición, explicación o detalle (1-2 oraciones)"),
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

// ===========================================================================
// PROMPTS por formato
// ===========================================================================
const FORMAT_PROMPTS: Record<string, string> = {
  puntos_clave:
    "Extraé entre 8 y 12 puntos clave del apunte. Cada punto debe ser una idea autocontenida que un estudiante pueda repasar individualmente. Asigná un emoji que represente el concepto, un título corto (3-8 palabras) y una descripción de 1-2 oraciones. Agrupá los puntos por subtema usando `category` cuando tenga sentido. Devolvé SIEMPRE en español rioplatense.",
  mapa: "Generá un mapa conceptual del apunte como markdown jerárquico listo para renderizar con markmap. Usá # para el tema central (una sola línea), ## para 3-5 ramas principales, ### para sub-conceptos, y guiones `-` para hojas. No te excedas de 4 niveles de profundidad. Devolvé SIEMPRE en español rioplatense.",
  ficha: "Armá una ficha de estudio con 3 a 5 secciones temáticas. Cada sección tiene un encabezado claro, un emoji representativo, y 2-6 items con label (término/concepto) y detail (definición). Las secciones sugeridas: Definiciones clave, Conceptos / Fórmulas, Ejemplos, A recordar / errores frecuentes. Devolvé SIEMPRE en español rioplatense.",
  resumen: "Transformá el apunte en un resumen de estudio premium en Markdown. Seguí la estructura requerida al pie de la letra.",
};

const SYSTEM_PROMPT =
  "Sos un asistente de estudio en español rioplatense. Generás material claro, organizado y atractivo para que un estudiante universitario pueda repasar. Nunca inventes información que no esté en el apunte. Si el apunte no contiene material académico relevante, decílo en la descripción. Sé conciso pero completo.";

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
    if (!FORMAT_PROMPTS[format])
      return NextResponse.json({ error: "invalid format" }, { status: 400 });

    const { note, content, userRow } = await getNoteContent(note_id);
    if (content.type === "unsupported")
      return NextResponse.json(
        { error: "tipo de archivo no soportado (subí PDF, imagen o texto)" },
        { status: 415 },
      );

    const isPaid = isPaidPlan(userRow.plan, userRow.expires_at);
    const isProCredits = userRow.plan === "pro"; // solo pro usa créditos
    const model = modelForGeneration(userRow.plan, userRow.expires_at, "summarize");
    if (isProCredits && userRow.credits < COST)
      return NextResponse.json(
        { error: "insufficient_credits", cost: COST, available: userRow.credits },
        { status: 402 },
      );
    // FREE: 1 suite de por vida. Segundo intento → paywall.
    if (userRow.plan === "free") {
      const allowed = await isFreeGenerationAllowed(userRow.id);
      if (!allowed) return NextResponse.json({ error: "free_limit_reached" }, { status: 402 });
    }

    const userParts = await buildUserContent(content, FORMAT_PROMPTS[format], isPaid);

    let payload: unknown;
    let usage: { inputTokens?: number; outputTokens?: number } | undefined;
    if (format === "puntos_clave") {
      const r = await generateObject({
        model: anthropic(model),
        schema: PuntosClaveSchema,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts }],
      });
      payload = r.object;
      usage = r.usage;
    } else if (format === "mapa") {
      const r = await generateObject({
        model: anthropic(model),
        schema: MapaSchema,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts }],
      });
      payload = r.object;
      usage = r.usage;
    } else if (format === "resumen") {
      const r = await generateText({
        model: anthropic(model),
        system: RESUMEN_SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts }],
        maxOutputTokens: 8000,
      });
      payload = { text: r.text };
      usage = r.usage;
    } else {
      const r = await generateObject({
        model: anthropic(model),
        schema: FichaSchema,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userParts }],
      });
      payload = r.object;
      usage = r.usage;
    }

    let remaining = 0;
    if (isProCredits) {
      remaining = await chargeCredits(userRow.id, COST);
    }
    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "summary",
      format,
      title: note.title,
      content: { format, data: payload },
      credits_used: isProCredits ? COST : 0,
      model,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
    });

    // Activación: primera generación con material propio → evento Meta.
    const activationEventId = await markActivationIfFirst(userRow.id);

    return NextResponse.json({
      ok: true,
      output_id: id,
      format,
      data: payload,
      credits_remaining: remaining,
      is_paid: isPaid,
      activation_event_id: activationEventId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/summarize]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
