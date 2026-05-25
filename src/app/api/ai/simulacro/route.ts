import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  MODEL,
  buildUserContent,
  chargeCredits,
  getNoteContent,
  saveAiOutput,
} from "@/lib/ai/claude";

const COST = 18;

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

const SimulacroSchema = z.object({
  title: z.string().describe("Título del simulacro basado en el contenido del apunte"),
  questions: z
    .array(z.discriminatedUnion("kind", [MultipleChoice, TrueFalse, ShortAnswer]))
    .min(5)
    .max(10),
});

const SYSTEM_PROMPT =
  "Sos un docente universitario que arma simulacros de examen en español rioplatense. Para cada apunte que recibís generás un examen mixto de 5 a 8 preguntas: opción múltiple, verdadero/falso, y desarrollo corto. Las preguntas deben evaluar comprensión y aplicación (no solo memorización). Las opciones de multiple choice deben tener exactamente 4 alternativas plausibles. Las explicaciones tienen que justificar por qué la respuesta es correcta y por qué las otras son incorrectas. Nunca inventes información que no esté en el apunte.";

const USER_INSTRUCTION =
  "Armá un simulacro de examen sobre este apunte. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer). Devolvé SIEMPRE en español.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const note_id = body.note_id as string;
    if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const { note, content, userRow } = await getNoteContent(note_id);
    if (content.type === "unsupported")
      return NextResponse.json({ error: "tipo de archivo no soportado" }, { status: 415 });
    if (userRow.credits < COST)
      return NextResponse.json(
        { error: "insufficient_credits", cost: COST, available: userRow.credits },
        { status: 402 },
      );

    const userParts = buildUserContent(content, USER_INSTRUCTION);

    const result = await generateObject({
      model: anthropic(MODEL),
      schema: SimulacroSchema,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userParts }],
    });

    const remaining = await chargeCredits(userRow.id, COST);
    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "simulacro",
      title: result.object.title || `Simulacro · ${note.title}`,
      content: result.object,
      credits_used: COST,
    });

    return NextResponse.json({
      ok: true,
      output_id: id,
      simulacro: result.object,
      credits_remaining: remaining,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/simulacro]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
