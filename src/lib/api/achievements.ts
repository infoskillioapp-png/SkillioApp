import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SkillioUser } from "@/lib/sync-user";

const NAMES = [
  "Novato", "Curioso", "Aplicado", "Constante", "Dedicado", "Enfocado",
  "Explorador", "Sabio", "Experto", "Maestro", "Leyenda", "Elite",
];

export const LEVEL_ROADMAP = NAMES.map((name, i) => ({
  level: i + 1,
  name,
  benefit:
    [
      "Tu primer paso",
      "Insignia Curioso desbloqueada",
      "+5 créditos IA mensuales",
      "Avatar personalizado",
      "Logros visibles en la Comunidad",
      "Modo oscuro premium",
      "Insignia Explorador",
      "+10 créditos IA mensuales",
      "Skins exclusivos del Pomodoro",
      "Mentor: ayudás a otros usuarios",
      "Acceso anticipado a features",
      "Inmortalidad académica",
    ][i] ?? "",
}));

export type AchievementKey =
  | "streak_7"
  | "streak_12"
  | "streak_30"
  | "early_bird"
  | "studyathon"
  | "perfectionist"
  | "pomodorador"
  | "social"
  | "early_adopter"
  | "top_10"
  | "graduate"
  | "elite";

type AchievementDef = {
  key: AchievementKey;
  icon: string;
  title: string;
  description: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "streak_7", icon: "🔥", title: "Racha 7 días", description: "Una semana seguida" },
  { key: "streak_12", icon: "🔥", title: "Racha 12 días", description: "Imparable" },
  { key: "early_bird", icon: "⚡", title: "Madrugador", description: "3 sesiones antes de las 9am" },
  { key: "studyathon", icon: "📚", title: "Studyathon", description: "5 horas en un día" },
  { key: "perfectionist", icon: "🎯", title: "Perfeccionista", description: "100% en un test" },
  { key: "pomodorador", icon: "🍅", title: "Pomodorador", description: "50 pomodoros completados" },
  { key: "social", icon: "👥", title: "Social", description: "Compartiste 5 apuntes" },
  { key: "early_adopter", icon: "🚀", title: "Early adopter", description: "Uno de los primeros 1000" },
  { key: "streak_30", icon: "🔥", title: "Racha 30 días", description: "Un mes entero" },
  { key: "top_10", icon: "🏆", title: "Top 10", description: "Entrá al ranking semanal" },
  { key: "graduate", icon: "🎓", title: "Graduado", description: "Completá todas las materias" },
  { key: "elite", icon: "💎", title: "Elite", description: "Llegá al nivel 12" },
];

export type AchievementState = AchievementDef & {
  unlocked: boolean;
  progress?: string;
};

export type StreakDay = { date: string; count: number };

export type LogrosData = {
  user: SkillioUser;
  pomodorosCount: number;
  publicNotesCount: number;
  earlyBirdCount: number;
  bestStudyDayMinutes: number;
  streakHeatmap: StreakDay[];
  achievements: AchievementState[];
};

async function requireUserRow() {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const sb = supabaseAdmin();
  return { sb, clerk_user_id: userId };
}

export async function getLogrosData(user: SkillioUser): Promise<LogrosData> {
  const { sb } = await requireUserRow();

  // Pomodoros del user (focus completados)
  const { data: poms } = await sb
    .from("pomodoro_sessions")
    .select("duration_minutes, started_at, mode, completed")
    .eq("user_id", user.id);

  const focus = (poms ?? []).filter(
    (p) => p.mode === "focus" && p.completed,
  );
  const pomodorosCount = focus.length;

  // Earlys: foco antes de las 9am
  const earlyBirdCount = focus.filter((p) => {
    const h = new Date(p.started_at).getHours();
    return h < 9;
  }).length;

  // Mejor dia de estudio (minutos)
  const byDay = new Map<string, number>();
  for (const p of focus) {
    const k = p.started_at.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + (p.duration_minutes ?? 0));
  }
  const bestStudyDayMinutes = Math.max(0, ...Array.from(byDay.values()));

  // Heatmap: ultimos 35 dias
  const days = 35;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const streakHeatmap: StreakDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    streakHeatmap.push({ date: k, count: byDay.get(k) ?? 0 });
  }

  // Public notes
  const { count: publicNotesCount } = await sb
    .from("notes")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", user.id)
    .eq("is_public", true);

  const a = (key: AchievementKey, unlocked: boolean, progress?: string) => {
    const def = ACHIEVEMENTS.find((x) => x.key === key)!;
    return { ...def, unlocked, progress };
  };

  const achievements: AchievementState[] = [
    a("streak_7", user.current_streak >= 7, user.current_streak >= 7 ? undefined : `${user.current_streak}/7`),
    a("streak_12", user.current_streak >= 12),
    a("early_bird", earlyBirdCount >= 3, earlyBirdCount >= 3 ? undefined : `${earlyBirdCount}/3`),
    a("studyathon", bestStudyDayMinutes >= 300, bestStudyDayMinutes >= 300 ? undefined : `${Math.floor(bestStudyDayMinutes / 60)}h/5h`),
    a("perfectionist", false, "—"),
    a("pomodorador", pomodorosCount >= 50, pomodorosCount >= 50 ? undefined : `${pomodorosCount}/50`),
    a("social", (publicNotesCount ?? 0) >= 5, (publicNotesCount ?? 0) >= 5 ? undefined : `${publicNotesCount ?? 0}/5`),
    a("early_adopter", true),
    a("streak_30", user.current_streak >= 30, user.current_streak >= 30 ? undefined : `${user.current_streak}/30`),
    a("top_10", false),
    a("graduate", false),
    a("elite", user.level >= 12),
  ];

  return {
    user,
    pomodorosCount,
    publicNotesCount: publicNotesCount ?? 0,
    earlyBirdCount,
    bestStudyDayMinutes,
    streakHeatmap,
    achievements,
  };
}
