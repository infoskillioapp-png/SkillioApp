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
  cards: z.array(Flashcard).min(8).max(20),
});

const SYSTEM_PROMPT =
  "Sos un asistente de estudio en español rioplatense que arma mazos de flashcards para repetición espaciada. Para cada concepto importante creás una tarjeta con una pregunta clara al frente y una respuesta concisa al dorso. Las preguntas deben ser activas (no 'qué es X' sino 'cuál es la diferencia entre X e Y', 'cuándo se aplica X', 'qué pasa si...'). Nunca inventes información que no esté en el apunte.";

const USER_INSTRUCTION =
  "Generá entre 8 y 15 flashcards de alta calidad a partir de este apunte. Cubrí los conceptos centrales y agrupalos por subtema en `category` cuando tenga sentido. Devolvé SIEMPRE en español.";

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
      schema: FlashcardsSchema,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userParts }],
    });

    const remaining = await chargeCredits(userRow.id, COST);
    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "flashcards",
      title: result.object.deck_title || note.title,
      content: result.object,
      credits_used: COST,
    });

    return NextResponse.json({
      ok: true,
      output_id: id,
      deck: result.object,
      credits_remaining: remaining,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/flashcards]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
