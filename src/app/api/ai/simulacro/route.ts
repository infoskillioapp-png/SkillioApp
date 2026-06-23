import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import {
  buildUserContent,
  chargeCredits,
  getNoteContent,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
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
    .min(3)
    .max(20),
});

const SYSTEM_PROMPT =
  "Sos un docente universitario que arma simulacros de examen en español rioplatense. Generás exámenes mixtos con preguntas de opción múltiple, verdadero/falso y desarrollo corto. Las preguntas deben evaluar comprensión y aplicación (no solo memorización). Las opciones de multiple choice deben tener exactamente 4 alternativas plausibles. Las explicaciones tienen que justificar por qué la respuesta es correcta y por qué las otras son incorrectas. Nunca inventes información que no esté en el apunte.";

const USER_INSTRUCTION_FREE =
  "Armá una muestra de 5 preguntas sobre los conceptos principales de este apunte. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer). Devolvé SIEMPRE en español.";

const USER_INSTRUCTION_PRO =
  "Armá un simulacro completo de 20 preguntas sobre este apunte. Cubrí la mayor cantidad de temas y subtemas posible. Mezclá tipos de pregunta (multiple_choice, true_false, short_answer), con predominio de multiple_choice. Devolvé SIEMPRE en español.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const note_id = body.note_id as string;
    if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const { note, content, userRow } = await getNoteContent(note_id);
    if (content.type === "unsupported")
      return NextResponse.json({ error: "tipo de archivo no soportado" }, { status: 415 });

    const isPaid = isPaidPlan(userRow.plan, userRow.expires_at);
    const isProCredits = userRow.plan === "pro";
    const model = modelForGeneration(userRow.plan, userRow.expires_at, "simulacro");

    if (isProCredits && userRow.credits < COST)
      return NextResponse.json(
        { error: "insufficient_credits", cost: COST, available: userRow.credits },
        { status: 402 },
      );

    const userInstruction = isPaid ? USER_INSTRUCTION_PRO : USER_INSTRUCTION_FREE;
    const userParts = await buildUserContent(content, userInstruction, isPaid);

    const result = await generateObject({
      model: anthropic(model),
      schema: SimulacroSchema,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userParts }],
    });

    let remaining = 0;
    if (isProCredits) {
      remaining = await chargeCredits(userRow.id, COST);
    }
    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "simulacro",
      title: result.object.title || `Simulacro · ${note.title}`,
      content: result.object,
      credits_used: isProCredits ? COST : 0,
      model,
      input_tokens: result.usage?.inputTokens ?? null,
      output_tokens: result.usage?.outputTokens ?? null,
    });

    const activationEventId = await markActivationIfFirst(userRow.id);

    return NextResponse.json({
      ok: true,
      output_id: id,
      simulacro: result.object,
      credits_remaining: remaining,
      is_paid: isPaid,
      activation_event_id: activationEventId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/simulacro]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
