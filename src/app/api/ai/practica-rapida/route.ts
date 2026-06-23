import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";

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

const SYSTEM =
  "Sos un docente universitario. Generás exactamente 2 preguntas de opción múltiple (4 opciones cada una) sobre el concepto específico que te dan. Las preguntas evalúan comprensión, no memorización. Las opciones incorrectas deben ser plausibles. Explicación corta de por qué la correcta es correcta. Respondé SIEMPRE en español rioplatense.";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { title, description, category } = await req.json();
  if (!title || !description)
    return NextResponse.json({ error: "title and description required" }, { status: 400 });

  const prompt = `Concepto: "${title}"${category ? ` (subtema: ${category})` : ""}
Descripción: ${description}

Generá 2 preguntas de opción múltiple específicamente sobre este concepto.`;

  try {
    const result = await generateObject({
      model: anthropic(MODEL),
      schema: QuestionSchema,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    return NextResponse.json(result.object);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/practica-rapida]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
