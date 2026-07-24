import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveActor } from "@/lib/actor";

// Guarda el resultado de una partida del juego. NO cuenta contra el límite de
// apuntes (no es una generación de IA — es jugar con contenido ya generado).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const note_id = typeof body.note_id === "string" ? body.note_id : "";
  const score = Number.isFinite(body.score) ? Math.max(0, Math.round(body.score)) : 0;
  const accuracy = Number.isFinite(body.accuracy) ? Math.min(100, Math.max(0, Math.round(body.accuracy))) : 0;
  if (!note_id) return NextResponse.json({ error: "note_id required" }, { status: 400 });

  let u: { id: string };
  try {
    u = await resolveActor();
  } catch {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const sb = supabaseAdmin();
  const { data: prev } = await sb
    .from("game_scores")
    .select("best_score, best_accuracy, games_played")
    .eq("user_id", u.id)
    .eq("note_id", note_id)
    .maybeSingle();

  const prevBest = prev?.best_score ?? 0;
  const isRecord = score > prevBest;

  const row = {
    user_id: u.id,
    note_id,
    best_score: Math.max(prevBest, score),
    best_accuracy: Math.max(prev?.best_accuracy ?? 0, accuracy),
    games_played: (prev?.games_played ?? 0) + 1,
    last_played_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb.from("game_scores").upsert(row, { onConflict: "user_id,note_id" });
  if (error) {
    console.error("[game.score]", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, best_score: row.best_score, is_record: isRecord });
}
