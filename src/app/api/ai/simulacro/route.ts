import { NextResponse } from "next/server";
import { recordAiUsage, checkUsageLimit } from "@/lib/ai/usage";
import { resolveActor } from "@/lib/actor";
import {
  getNoteContent,
  isFreeGenerationAllowed,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
  saveAiOutput,
} from "@/lib/ai/claude";
import { genSimulacro } from "@/lib/ai/suite";

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
    const model = modelForGeneration(userRow.plan, userRow.expires_at, "simulacro");

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

    const { object, usage, title } = await genSimulacro(content, model, isPaid);

    const id = await saveAiOutput({
      user_id: userRow.id,
      note_id: note.id,
      kind: "simulacro",
      title: title || `Simulacro · ${note.title}`,
      content: object,
      credits_used: 0,
      model,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
    });

    await recordAiUsage({ kind: "simulacro", model, usage, userDbId: userRow.id });
    const activationEventId = await markActivationIfFirst(userRow.id);

    return NextResponse.json({
      ok: true,
      output_id: id,
      simulacro: object,
      credits_remaining: 0,
      is_paid: isPaid,
      activation_event_id: activationEventId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/simulacro]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
