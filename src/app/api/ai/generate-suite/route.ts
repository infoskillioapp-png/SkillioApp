import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actor";
import { recordAiUsage } from "@/lib/ai/usage";
import {
  getNoteContent,
  isFreeGenerationAllowed,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
  saveAiOutput,
} from "@/lib/ai/claude";
import { genSummaryPuntos, genFlashcards, genSimulacro } from "@/lib/ai/suite";

// Endpoint COMBINADO de la suite: descarga y prepara el apunte UNA sola vez
// (antes cada una de las 3 llamadas lo bajaba y parseaba por separado) y dispara
// resumen + tarjetas + simulacro en paralelo. Baja bastante el tiempo del espacio.
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

    // Gate free "1 de por vida": si ya generó algo, paywall.
    if (userRow.plan === "free") {
      const allowed = await isFreeGenerationAllowed(userRow.id);
      if (!allowed) return NextResponse.json({ error: "free_limit_reached" }, { status: 402 });
    }

    const summaryModel = modelForGeneration(userRow.plan, userRow.expires_at, "summarize");
    const flashModel = modelForGeneration(userRow.plan, userRow.expires_at, "flashcards");
    const simModel = modelForGeneration(userRow.plan, userRow.expires_at, "simulacro");

    // Las 3 en paralelo, reusando el MISMO content ya descargado/parseado.
    const [sumRes, fcRes, simRes] = await Promise.allSettled([
      genSummaryPuntos(content, summaryModel, isPaid),
      genFlashcards(content, flashModel, isPaid),
      genSimulacro(content, simModel, isPaid),
    ]);

    // Guardado (cada uno independiente: si una falla, las otras igual se guardan).
    const saved: Record<string, boolean> = { summary: false, flashcards: false, simulacro: false };

    if (sumRes.status === "fulfilled") {
      await saveAiOutput({
        user_id: userRow.id, note_id: note.id, kind: "summary", format: "puntos_clave",
        title: sumRes.value.title || note.title, content: { format: "puntos_clave", data: sumRes.value.object },
        credits_used: 0, model: summaryModel,
        input_tokens: sumRes.value.usage?.inputTokens ?? null, output_tokens: sumRes.value.usage?.outputTokens ?? null,
      });
      await recordAiUsage({ kind: "summarize", model: summaryModel, usage: sumRes.value.usage, userDbId: userRow.id });
      saved.summary = true;
    } else {
      console.error("[generate-suite] summary falló:", sumRes.reason);
    }

    if (fcRes.status === "fulfilled") {
      await saveAiOutput({
        user_id: userRow.id, note_id: note.id, kind: "flashcards",
        title: fcRes.value.title || note.title, content: fcRes.value.object,
        credits_used: 0, model: flashModel,
        input_tokens: fcRes.value.usage?.inputTokens ?? null, output_tokens: fcRes.value.usage?.outputTokens ?? null,
      });
      await recordAiUsage({ kind: "flashcards", model: flashModel, usage: fcRes.value.usage, userDbId: userRow.id });
      saved.flashcards = true;
    } else {
      console.error("[generate-suite] flashcards falló:", fcRes.reason);
    }

    if (simRes.status === "fulfilled") {
      await saveAiOutput({
        user_id: userRow.id, note_id: note.id, kind: "simulacro",
        title: simRes.value.title || `Simulacro · ${note.title}`, content: simRes.value.object,
        credits_used: 0, model: simModel,
        input_tokens: simRes.value.usage?.inputTokens ?? null, output_tokens: simRes.value.usage?.outputTokens ?? null,
      });
      await recordAiUsage({ kind: "simulacro", model: simModel, usage: simRes.value.usage, userDbId: userRow.id });
      saved.simulacro = true;
    } else {
      console.error("[generate-suite] simulacro falló:", simRes.reason);
    }

    // Si NINGUNA salió, error duro (el cliente reintenta / muestra fallo).
    if (!saved.summary && !saved.flashcards && !saved.simulacro)
      return NextResponse.json({ error: "generation_failed" }, { status: 500 });

    // Activación (1ª generación con material propio) — una sola vez.
    const activationEventId = await markActivationIfFirst(userRow.id);

    return NextResponse.json({ ok: true, saved, is_paid: isPaid, activation_event_id: activationEventId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/generate-suite]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
