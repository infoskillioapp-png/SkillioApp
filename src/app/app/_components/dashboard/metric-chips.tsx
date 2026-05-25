import type { DashboardStats } from "@/lib/db";

type Chip = {
  label: string;
  value: string;
  sub: string;
  tone: "accent" | "warning" | "success" | "info";
};

const TONE = {
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
} as const;

export function MetricChips({ stats }: { stats: DashboardStats }) {
  const hours = (stats.total_study_minutes / 60).toFixed(1).replace(".0", "");

  const chips: Chip[] = [
    {
      label: "XP Total",
      value: stats.total_xp.toLocaleString("es-AR"),
      sub: `Nivel ${stats.level}`,
      tone: "accent",
    },
    {
      label: "Horas de estudio",
      value: hours,
      sub: `${stats.focus_sessions_count} pomodoros`,
      tone: "warning",
    },
    {
      label: "Tests completados",
      value: String(stats.tests_completed),
      sub: stats.tests_completed === 0 ? "Probá un simulacro IA" : "Última semana",
      tone: "success",
    },
    {
      label: "Referidos",
      value: String(stats.referrals),
      sub: "Invitá amigos +15d",
      tone: "info",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
      {chips.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl bg-paper border border-rule-soft p-4 flex items-start gap-3 hover:border-rule transition"
        >
          <span className={`w-9 h-9 rounded-xl ${TONE[c.tone]} flex items-center justify-center font-display font-bold text-sm shrink-0`}>
            {c.label[0]}
          </span>
          <div className="min-w-0">
            <div className="eyebrow text-[10px]">{c.label}</div>
            <div className="font-display font-bold text-2xl tracking-[-0.02em] leading-tight num">
              {c.value}
            </div>
            <div className="text-[11.5px] text-ink-soft truncate">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
