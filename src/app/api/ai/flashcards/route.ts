import { NextResponse } from "next/server";
import { generateObject } from "ai";
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

const COST = 17;

const Flashcard = z.object({
  front: z.string().describe("Pregunta o concepto en el frente de la tarjeta"),
  back: z.string().describe("Respuesta clara y completa, en una o dos oraciones"),
  category: z.string().optional().describe("Subtema o categoría dentro del apunte"),
});

const FlashcardsSchema = z.object({
  deck_title: z
    .string()
    .describe("Título corto descriptivo del mazo basado en el apunte"),
  cards: z.array(Flashcard).min(3).max(15),
});

const SYSTEM_PROMPT =
  "Sos un asistente de estudio en español rioplatense que arma mazos de flashcards para repetición espaciada. Para cada concepto importante creás una tarjeta con una pregunta clara al frente y una respuesta concisa al dorso. Las preguntas deben ser activas (no 'qué es X' sino 'cuál es la diferencia entre X e Y', 'cuándo se aplica X', 'qué pasa si...'). Nunca inventes información que no esté en el apunte.";

const USER_INSTRUCTION_FREE =
  "Generá exactamente 4 flashcards de muestra sobre los conceptos más importantes de este apunte. Agrupalos por subtema en `category`. Devolvé SIEMPRE en español.";

const USER_INSTRUCTION_PRO =
  "Generá exactamente 15 flashcards de alta calidad a partir de este apunte. Cubrí todos los conceptos centrales y agrupalos por subtema en `category`. Devolvé SIEMPRE en español.";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const note_id = body.note_id as string;
    if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const { note, content, userRow } = await getNoteContent(note_id);
    if (content.type === "unsupported")
      return NextResponse.json({ error: "tipo de archivo no soportado" }, { status: 415 });

    const isPaid = isPaidPlan(userRow.plan, userRow.expires_at);
    const isProCredits = false; // sistema de créditos deprecado: todos los pagos son ilimitados
    const model = modelForGeneration(userRow.plan, userRow.expires_at, "flashcards");

    if (isProCredits && userRow.credits < COST)
      return NextResponse.json(
        { error: "insufficient_credits", cost: COST, available: userRow.credits },
        { status: 402 },
      );
    if (userRow.plan === "free") {
      const allowed = await isFreeGenerationAllowed(userRow.id);
      if (!allowed) return NextResponse.json({ error: "free_limit_reached" }, { status: 402 });
    }

    const userInstruction = isPaid ? USER_INSTRUCTION_PRO : USER_INSTRUCTION_FREE;
    const userParts = await buildUserContent(content, userInstruction, isPaid);

    const result = await generateObject({
      model: anthropic(model),
      schema: FlashcardsSchema,
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
      kind: "flashcards",
      title: result.object.deck_title || note.title,
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
      deck: result.object,
      credits_remaining: remaining,
      is_paid: isPaid,
      activation_event_id: activationEventId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/flashcards]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
