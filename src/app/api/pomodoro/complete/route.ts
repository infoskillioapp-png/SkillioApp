import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { levelForXp } from "@/lib/level";

const FOCUS_XP = 50;
const VALID_MODES = ["focus", "short_break", "long_break"] as const;
type Mode = (typeof VALID_MODES)[number];

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { mode?: string; duration_minutes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const mode = body.mode as Mode;
  const duration = Number(body.duration_minutes);
  if (!VALID_MODES.includes(mode))
    return NextResponse.json({ error: "invalid mode" }, { status: 400 });
  if (!Number.isFinite(duration) || duration < 1 || duration > 120)
    return NextResponse.json({ error: "invalid duration" }, { status: 400 });

  const sb = supabaseAdmin();

  // Resolver user_id
  const { data: u, error: ue } = await sb
    .from("users")
    .select("id, total_xp")
    .eq("clerk_user_id", userId)
    .maybeSingle();
  if (ue || !u) {
    console.error("[api/pomodoro/complete] user lookup error", ue);
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const xpEarned = mode === "focus" ? FOCUS_XP : 0;
  const newXp = (u.total_xp ?? 0) + xpEarned;
  const newLevel = levelForXp(newXp);

  const now = new Date();
  const startedAt = new Date(now.getTime() - duration * 60_000).toISOString();
  const endedAt = now.toISOString();

  // 1) Insert sesion
  const { error: sErr } = await sb.from("pomodoro_sessions").insert({
    user_id: u.id,
    mode,
    duration_minutes: duration,
    completed: true,
    xp_earned: xpEarned,
    started_at: startedAt,
    ended_at: endedAt,
  });
  if (sErr) {
    console.error("[api/pomodoro/complete] insert session error", sErr);
    return NextResponse.json({ error: "session insert failed" }, { status: 500 });
  }

  // 2) Sumar XP + recalcular nivel (solo si la sesion da XP)
  if (xpEarned > 0) {
    const { error: upErr } = await sb
      .from("users")
      .update({ total_xp: newXp, level: newLevel })
      .eq("id", u.id);
    if (upErr) console.error("[api/pomodoro/complete] user update error", upErr);

    const { error: xpErr } = await sb.from("xp_log").insert({
      user_id: u.id,
      source: "pomodoro",
      amount: xpEarned,
      metadata: { mode, duration_minutes: duration },
    });
    if (xpErr) console.error("[api/pomodoro/complete] xp_log insert error", xpErr);
  }

  return NextResponse.json({
    ok: true,
    xp_earned: xpEarned,
    total_xp: newXp,
    level: newLevel,
  });
}
