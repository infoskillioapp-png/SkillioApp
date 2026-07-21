import { NextResponse } from "next/server";
import { recordAiUsage } from "@/lib/ai/usage";
import { resolveActor } from "@/lib/actor";
import {
  getNoteContent,
  isFreeGenerationAllowed,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
  saveAiOutput,
} from "@/lib/ai/claude";
import { genFlashcards } from "@/lib/ai/suite";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const note_id = body.note_id as string;
    if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    const actor = await resolveActor();
    const { note, content, userRow } = await getNoteContent(note_id, actor);
    if (content.type === "unsupported")
      return NextResponse.json({ error: "tipo de archivo no soportado" }, { status: 415 });

    const isPaid = isPaidPlan(userRow.plan, userRow.expires_at);
    const model = modelForGeneration(userRow.plan, userRow.expires_at, "flashcards");

    if (userRow.plan === "free") {
      const allowed = await isFreeGenerationAllowed(userRow.id);
      if (!allowed) return NextResponse.json({ error: "free_limit_reached" }, { status: 402 });
    }

    const { object, usage, title } = await genFlashcards(content, model, isPaid);

    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "flashcards",
      title: title || note.title,
      content: object,
      credits_used: 0,
      model,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
    });

    await recordAiUsage({ kind: "flashcards", model, usage, userDbId: userRow.id });
    const activationEventId = await markActivationIfFirst(userRow.id);

    return NextResponse.json({
      ok: true,
      output_id: id,
      deck: object,
      credits_remaining: 0,
      is_paid: isPaid,
      activation_event_id: activationEventId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/flashcards]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
