import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getActorReadonly } from "@/lib/actor";
import { isPaidPlan } from "@/lib/ai/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readSummaryMarkdown } from "@/lib/notes/summary-markdown";
import { synthesizeSummary, type VoiceGender } from "@/lib/ai/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "tts";
// Bumpear si cambia la lógica de SSML/narración (invalida el cache anterior).
// v2: marcas SSML + timepoints para subtítulos.
const TTS_VERSION = "v2";
// Neural2/Wavenet: US$16 por 1M de caracteres (para reportar costo real).
const USD_PER_MILLION = 16;

export async function POST(req: Request) {
  try {
    const actor = await getActorReadonly();
    if (!actor || actor.isAnon) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Gating: por ahora SOLO PRO (para testear y medir costo). A futuro, free
    // podrá generar solo la primera sección → pasar firstSectionOnly:true.
    const isPro = isPaidPlan(actor.plan, actor.expires_at);
    if (!isPro) {
      return NextResponse.json({ error: "pro_required" }, { status: 402 });
    }

    const body = (await req.json().catch(() => ({}))) as { noteId?: string; voice?: string };
    const noteId = typeof body.noteId === "string" ? body.noteId : "";
    const gender: VoiceGender = body.voice === "m" ? "m" : "f";
    if (!noteId) return NextResponse.json({ error: "note_id_requerido" }, { status: 400 });

    const sb = supabaseAdmin();

    // Ownership del apunte.
    const { data: note } = await sb
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("user_id", actor.id)
      .single();
    if (!note) return NextResponse.json({ error: "note_not_found" }, { status: 404 });

    // El texto se toma del resumen GUARDADO (no del cliente): así nadie manda
    // texto arbitrario a facturar.
    const { data: outputs } = await sb
      .from("ai_outputs")
      .select("kind, content")
      .eq("note_id", noteId)
      .eq("user_id", actor.id);
    const md = readSummaryMarkdown(outputs?.find((o) => o.kind === "summary")?.content);
    if (!md) return NextResponse.json({ error: "sin_resumen" }, { status: 400 });

    // Cache: el audio de un resumen es determinístico. Key = hash(md+voz+ver).
    const hash = createHash("sha256").update(`${TTS_VERSION}|${gender}|${md}`).digest("hex").slice(0, 16);
    const path = `${actor.id}/${noteId}.${gender}.${hash}.mp3`;
    const cuesPath = `${actor.id}/${noteId}.${gender}.${hash}.cues.json`;

    const { data: cached } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (cached?.signedUrl) {
      let cues: unknown = [];
      const dl = await sb.storage.from(BUCKET).download(cuesPath);
      if (dl.data) { try { cues = JSON.parse(await dl.data.text()); } catch { /* sin cues */ } }
      return NextResponse.json({ url: cached.signedUrl, cached: true, cues });
    }

    // Generar.
    const { mp3, chars, chunks, cues } = await synthesizeSummary(md, gender);
    const estCostUsd = +(chars / 1_000_000 * USD_PER_MILLION).toFixed(4);
    console.log(`[tts] note=${noteId} voz=${gender} chunks=${chunks} chars=${chars} cues=${cues.length} ~US$${estCostUsd}`);

    const up = await sb.storage.from(BUCKET).upload(path, mp3, { contentType: "audio/mpeg", upsert: true });
    if (up.error) throw new Error(`upload: ${up.error.message}`);
    await sb.storage.from(BUCKET).upload(cuesPath, Buffer.from(JSON.stringify(cues)), { contentType: "application/json", upsert: true });

    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (!signed?.signedUrl) throw new Error("no se pudo firmar la URL del audio");

    return NextResponse.json({ url: signed.signedUrl, cached: false, chars, estCostUsd, cues });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("[api/ai/tts]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
