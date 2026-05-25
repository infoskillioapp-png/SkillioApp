import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SkillioUser } from "@/lib/sync-user";

/**
 * Trae la fila de `public.users` del usuario logueado.
 * Asume que `syncUserToSupabase` ya corrio (lo hace el layout de /app).
 */
export async function getCurrentSkillioUser(): Promise<SkillioUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const { data, error } = await supabaseAdmin()
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[db] getCurrentSkillioUser error:", error);
    return null;
  }
  return (data as SkillioUser | null) ?? null;
}

export type PomodoroSession = {
  id: string;
  user_id: string;
  mode: "focus" | "short_break" | "long_break";
  duration_minutes: number;
  completed: boolean;
  xp_earned: number;
  started_at: string;
  ended_at: string | null;
};

/**
 * Estadisticas para los chips del Dashboard.
 */
export type DashboardStats = {
  total_xp: number;
  level: number;
  current_streak: number;
  focus_sessions_count: number;
  total_study_minutes: number;
  tests_completed: number;
  referrals: number;
};

export async function getDashboardStats(
  user: SkillioUser,
): Promise<DashboardStats> {
  const sb = supabaseAdmin();

  // Sumas de sesiones de foco completadas
  const { data: focus, error } = await sb
    .from("pomodoro_sessions")
    .select("duration_minutes")
    .eq("user_id", user.id)
    .eq("mode", "focus")
    .eq("completed", true);

  if (error) console.error("[db] getDashboardStats pomodoro error:", error);

  const focus_sessions_count = focus?.length ?? 0;
  const total_study_minutes =
    focus?.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0) ?? 0;

  return {
    total_xp: user.total_xp,
    level: user.level,
    current_streak: user.current_streak,
    focus_sessions_count,
    total_study_minutes,
    tests_completed: 0, // placeholder hasta Fase 6
    referrals: 0,
  };
}
