import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { resolveActor } from "@/lib/actor";
import { recordAiUsage, checkUsageLimit } from "@/lib/ai/usage";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Sin esto, la función corre con el timeout por defecto de Vercel (unos
// pocos segundos) — muy poco para un PDF de 30 páginas + Sonnet razonando
// sobre todo el contenido. Si se corta a mitad de camino, Vercel mata el
// proceso de golpe: no hay excepción que capturar, no llega nada a Sentry,
// no se guarda nada — exactamente lo que se vio (4+ min de espera, $0 de
// resultado, 0 filas en ai_usage). 300s es el máximo del plan Pro sin Fluid
// Compute.
export const maxDuration = 300;
import {
  getNoteContent,
  isFreeGenerationAllowed,
  isPaidPlan,
  markActivationIfFirst,
  modelForGeneration,
  saveAiOutput,
} from "@/lib/ai/claude";
import { genSummaryMarkdown, genFlashcards, genSimulacro } from "@/lib/ai/suite";

// Qué generar por defecto si el cliente no manda `kinds`. Se deja explícito
// para que el default sea seguro (las 3) — la PAUSA de tarjetas/simulacro se
// controla desde el cliente mandando kinds=["summary"] en la generación
// automática al subir (ver AUTO_GEN_KINDS en espacio-client).
const ALL_KINDS = ["summary", "flashcards", "simulacro"] as const;
type Kind = (typeof ALL_KINDS)[number];

// Endpoint COMBINADO de la suite: descarga y prepara el apunte UNA sola vez
// (antes cada una de las 3 llamadas lo bajaba y parseaba por separado) y dispara
// resumen + tarjetas + simulacro en paralelo. Baja bastante el tiempo del espacio.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const note_id = body.note_id as string;
    if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

    // Qué modos generar en esta llamada. La generación automática al subir manda
    // solo ["summary"] (pausa de tarjetas/simulacro); al tocar "Generar" en el
    // espacio se mandan las 3. Default seguro: las 3.
    const kinds: Kind[] = Array.isArray(body.kinds) && body.kinds.length
      ? ALL_KINDS.filter((k) => body.kinds.includes(k))
      : [...ALL_KINDS];

    const actor = await resolveActor();
    const { note, content, userRow } = await getNoteContent(note_id, actor);
    if (content.type === "unsupported")
      return NextResponse.json({ error: "tipo de archivo no soportado" }, { status: 415 });

    const isPaid = isPaidPlan(userRow.plan, userRow.expires_at);

    // Gate free "1 de por vida" (+ bonos por dejar el mail). Generar más modos de
    // un apunte YA generado no cuenta como nuevo (se pasa note.id).
    if (userRow.plan === "free") {
      const allowed = await isFreeGenerationAllowed(userRow.id, note.id);
      if (!allowed) return NextResponse.json({ error: "free_limit_reached" }, { status: 402 });
    }

    const summaryModel = modelForGeneration(userRow.plan, userRow.expires_at, "summarize");
    const flashModel = modelForGeneration(userRow.plan, userRow.expires_at, "flashcards");
    const simModel = modelForGeneration(userRow.plan, userRow.expires_at, "simulacro");

    // Si el usuario reintenta (p.ej. tocó de nuevo un modo que quedó en 0 items
    // porque esa generación falló), NO hay que regenerar lo que ya salió bien:
    // cada llamada (sobre todo el resumen, que corre en Sonnet) tiene costo real.
    // Traemos qué kinds ya están guardados para esta nota y saltamos esos.
    const { data: existingOutputs } = await supabaseAdmin()
      .from("ai_outputs")
      .select("kind")
      .eq("note_id", note.id)
      .eq("user_id", userRow.id);
    const already = new Set((existingOutputs ?? []).map((o) => o.kind as string));

    // Se genera un modo solo si el cliente lo pidió Y no está ya guardado.
    const want = (k: Kind) => kinds.includes(k) && !already.has(k);

    // Tope anti-abuso por CANTIDAD DE APUNTES (pagos): solo aplica cuando se va
    // a generar un resumen NUEVO (= un apunte nuevo). Las generaciones on-demand
    // de tarjetas/simulacro de un apunte ya existente no se topean.
    if (isPaid && want("summary")) {
      const limitCheck = await checkUsageLimit(userRow.id);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: "usage_limit_reached", reason: limitCheck.reason, resetAt: limitCheck.resetAt },
          { status: 402 },
        );
      }
    }

    // Las pedidas y faltantes, en paralelo, reusando el MISMO content ya
    // descargado/parseado. Las no pedidas se rechazan con "skip" (no es error).
    const [sumRes, fcRes, simRes] = await Promise.allSettled([
      want("summary") ? genSummaryMarkdown(content, summaryModel, isPaid) : Promise.reject(new Error("skip")),
      want("flashcards") ? genFlashcards(content, flashModel, isPaid) : Promise.reject(new Error("skip")),
      want("simulacro") ? genSimulacro(content, simModel, isPaid) : Promise.reject(new Error("skip")),
    ]);

    // Guardado (cada uno independiente: si una falla, las otras igual se guardan).
    // saved arranca en true para lo que ya existía (no hubo nada que hacer ahí).
    const saved: Record<string, boolean> = {
      summary: already.has("summary"), flashcards: already.has("flashcards"), simulacro: already.has("simulacro"),
    };

    if (sumRes.status === "fulfilled") {
      await saveAiOutput({
        user_id: userRow.id, note_id: note.id, kind: "summary", format: "markdown",
        title: sumRes.value.title || note.title, content: { format: "markdown", markdown: sumRes.value.markdown },
        credits_used: 0, model: summaryModel,
        input_tokens: sumRes.value.usage?.inputTokens ?? null, output_tokens: sumRes.value.usage?.outputTokens ?? null,
      });
      await recordAiUsage({ kind: "summarize", model: summaryModel, usage: sumRes.value.usage, userDbId: userRow.id });
      saved.summary = true;
    } else if (want("summary")) {
      console.error("[generate-suite] summary falló:", sumRes.reason);
      Sentry.captureException(sumRes.reason, { tags: { step: "generate-suite:summary" }, extra: { note_id: note.id } });
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
    } else if (want("flashcards")) {
      console.error("[generate-suite] flashcards falló:", fcRes.reason);
      Sentry.captureException(fcRes.reason, { tags: { step: "generate-suite:flashcards" }, extra: { note_id: note.id } });
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
    } else if (want("simulacro")) {
      console.error("[generate-suite] simulacro falló:", simRes.reason);
      Sentry.captureException(simRes.reason, { tags: { step: "generate-suite:simulacro" }, extra: { note_id: note.id } });
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
    Sentry.captureException(e, { tags: { step: "generate-suite:outer" } });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
