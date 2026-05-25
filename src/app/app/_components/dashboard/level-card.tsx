import { levelProgress } from "@/lib/level";
import type { SkillioUser } from "@/lib/sync-user";
import { AnimatedNumber } from "@/components/cult/animated-number";

const INSIGNIAS = [
  { icon: "🔥", label: "Racha 7", tone: "warning" as const },
  { icon: "🍅", label: "10 Pomodoros", tone: "accent" as const },
  { icon: "🚀", label: "Early adopter", tone: "info" as const },
];

const TONE = {
  warning: "bg-warning-soft text-warning border-warning/20",
  accent: "bg-accent-soft text-accent border-accent/20",
  info: "bg-info-soft text-info border-info/20",
  success: "bg-success-soft text-success border-success/20",
};

export function LevelCard({ user }: { user: SkillioUser }) {
  const lvl = levelProgress(user.total_xp);
  const nearLevelUp = lvl.xpToNext > 0 && lvl.xpToNext <= 100;

  return (
    <div className="rounded-3xl bg-paper border border-rule-soft p-6 flex flex-col relative overflow-hidden">
      {/* Glow de fondo cuando está cerca de subir */}
      {nearLevelUp && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background: "radial-gradient(ellipse at 50% 0%, rgba(165,64,45,0.12) 0%, transparent 70%)",
          }}
        />
      )}

      <div className="eyebrow mb-3 relative">Tu nivel</div>

      <div className="flex items-start gap-4 mb-5 relative">
        <div className="relative">
          <span
            className={`w-16 h-16 rounded-2xl bg-accent text-[#FBF1EF] font-display font-extrabold text-3xl flex items-center justify-center shrink-0 shadow-card ${nearLevelUp ? "animate-skillio-pulse-glow" : ""}`}
            style={nearLevelUp ? { boxShadow: "0 0 0 4px rgba(165,64,45,0.2), 0 4px 24px rgba(165,64,45,0.3)" } : undefined}
          >
            {String(lvl.level).padStart(2, "0")}
          </span>
          {nearLevelUp && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning flex items-center justify-center text-[8px] animate-bounce">
              ⚡
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-display font-bold text-xl leading-tight">{lvl.name}</div>
          <div className="text-[12.5px] text-ink-soft mt-0.5 flex items-center gap-1">
            <AnimatedNumber value={user.total_xp} stiffness={50} damping={14} /> XP
          </div>
          {nearLevelUp ? (
            <div className="text-[11px] text-warning font-semibold mt-1 animate-pulse">
              ¡Solo {lvl.xpToNext} XP para subir!
            </div>
          ) : (
            <div className="text-[11px] text-ink-softer mt-1">
              {lvl.xpToNext > 0 ? `Faltan ${lvl.xpToNext} XP para ${lvl.nextName}` : "¡Nivel máximo!"}
            </div>
          )}
        </div>
      </div>

      {/* Barra XP gorda con shimmer */}
      <div className="relative h-4 rounded-full bg-rule-soft overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-[width] duration-700 relative"
          style={{
            width: `${lvl.ratio * 100}%`,
            background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)",
            boxShadow: "0 0 10px var(--accent-glow)",
          }}
        >
          {/* Shimmer */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full overflow-hidden"
          >
            <div
              className="h-full w-12 absolute top-0"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
                animation: "xp-shimmer 2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-auto relative">
        {INSIGNIAS.map((i) => (
          <span
            key={i.label}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${TONE[i.tone]}`}
          >
            <span>{i.icon}</span> {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}
