import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { resolveActor } from "@/lib/actor";
import { recordAiUsage } from "@/lib/ai/usage";

export const maxDuration = 300;

const MODEL = "claude-haiku-4-5-20251001";

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      pregunta: z.string(),
      opciones: z.array(z.string()).length(4),
      correcta: z.number().int().min(0).max(3),
      explicacion: z.string(),
    })
  ).length(2),
});

// Objetivo de esta práctica: reforzar lo que el estudiante ACABA de leer, no
// evaluarlo con un caso nuevo. Las preguntas tienen que poder responderse
// directamente con el texto de abajo — nada de escenarios inventados ni
// aplicación a una situación distinta.
const SYSTEM =
  "Sos un docente universitario armando una práctica de refuerzo INMEDIATO — el estudiante acaba de leer el texto que te paso, y la pregunta tiene que poder responderse directamente con ESE texto, literalmente. Generás exactamente 2 preguntas de opción múltiple (4 opciones cada una) que testeen si retuvo lo que acaba de leer (¿cuáles son los elementos?, ¿qué relación describe el texto?, ¿qué dice sobre X?). NO inventes escenarios nuevos ni casos aplicados — eso es para el simulacro, no para acá. Las opciones incorrectas deben ser plausibles pero claramente distinguibles si leyó el texto. Explicación corta de por qué la correcta es correcta. Respondé SIEMPRE en español rioplatense.";

export async function POST(req: Request) {
  const actor = await resolveActor();

  const { title, description, category } = await req.json();
  if (!title || !description)
    return NextResponse.json({ error: "title and description required" }, { status: 400 });

  const prompt = `El estudiante acaba de leer este texto sobre "${title}"${category ? ` (subtema: ${category})` : ""}:

"""
${description}
"""

Generá 2 preguntas que refuercen literalmente lo que dice ESE texto — deben poder responderse con la información de arriba, sin inventar ningún caso nuevo.`;

  try {
    const result = await generateObject({
      model: anthropic(MODEL),
      schema: QuestionSchema,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    await recordAiUsage({ kind: "practica", model: MODEL, usage: result.usage, userDbId: actor.id });
    return NextResponse.json(result.object);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/practica-rapida]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
