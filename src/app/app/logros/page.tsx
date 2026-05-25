import { redirect } from "next/navigation";
import { getCurrentSkillioUser } from "@/lib/db";
import { getLogrosData, LEVEL_ROADMAP } from "@/lib/api/achievements";
import { levelProgress } from "@/lib/level";
import { AnimatedNumber } from "@/components/cult/animated-number";

const RANKING = [
  { rank: 1, name: "Lucía R.", xp: 1450 },
  { rank: 2, name: "Tomás G.", xp: 1020 },
  { rank: 3, name: "Sofía B.", xp: 840 },
  { rank: 4, name: "Martín S.", xp: 380, isMe: true },
  { rank: 5, name: "Camila V.", xp: 290 },
];

const HEATMAP_TONES = [
  "bg-rule-soft",
  "bg-accent/15",
  "bg-accent/35",
  "bg-accent/60",
  "bg-accent",
];

function heatTone(minutes: number) {
  if (minutes <= 0) return HEATMAP_TONES[0];
  if (minutes < 30) return HEATMAP_TONES[1];
  if (minutes < 60) return HEATMAP_TONES[2];
  if (minutes < 120) return HEATMAP_TONES[3];
  return HEATMAP_TONES[4];
}

export default async function LogrosPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const data = await getLogrosData(user);
  const lvl = levelProgress(user.total_xp);
  const nearLevelUp = lvl.xpToNext > 0 && lvl.xpToNext <= 150;

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="eyebrow mb-1.5">Logros</div>
        <h1 className="font-display font-extrabold text-4xl tracking-[-0.03em]">
          Tu mapa de <span className="italic text-accent">progreso.</span>
        </h1>
      </header>

      {/* Hero nivel — game-like */}
      <section className="rounded-3xl border border-rule-soft p-8 mb-6 flex flex-wrap items-center gap-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--paper) 0%, var(--paper-warm) 50%, var(--accent-softer) 100%)" }}
      >
        {/* Glow de fondo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -right-10 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />

        {/* Número de nivel grande */}
        <div className="text-center relative animate-skillio-fade-in">
          <div
            className="font-display font-extrabold text-[100px] sm:text-[120px] leading-none tracking-[-0.05em]"
            style={{
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 60%, #f4c969 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 4px 20px var(--accent-glow))",
            }}
          >
            {String(lvl.level).padStart(2, "0")}
          </div>
          <div className="font-display font-bold text-lg mt-1 text-ink">{lvl.name}</div>
        </div>

        {/* XP + barra */}
        <div className="flex-1 min-w-[280px] relative">
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[12.5px] uppercase tracking-[0.12em] text-ink-soft font-semibold">
              Experiencia
            </span>
            <span className="font-display font-bold text-lg flex items-center gap-1">
              <span className="text-accent">
                <AnimatedNumber value={user.total_xp} stiffness={40} damping={12} />
              </span>
              <span className="text-ink-softer text-sm">
                {" "}/ {user.total_xp + lvl.xpToNext} XP
              </span>
            </span>
          </div>

          {/* Barra XP grande con shimmer */}
          <div className="h-5 rounded-full bg-rule-soft overflow-hidden mb-3 relative">
            <div
              className="h-full rounded-full transition-[width] duration-1000 relative"
              style={{
                width: `${lvl.ratio * 100}%`,
                background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 70%, #f4c969 100%)",
                boxShadow: "0 0 16px var(--accent-glow)",
              }}
            >
              <div aria-hidden className="absolute inset-0 overflow-hidden rounded-full">
                <div
                  className="h-full w-16 absolute top-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    animation: "xp-shimmer 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          </div>

          {nearLevelUp ? (
            <div className="text-[12.5px] text-warning font-bold flex items-center gap-1 animate-pulse">
              ⚡ ¡Solo {lvl.xpToNext} XP para Nivel {lvl.level + 1} — {lvl.nextName}!
            </div>
          ) : (
            <div className="text-[12.5px] text-ink-soft">
              {lvl.xpToNext > 0
                ? `Faltan ${lvl.xpToNext} XP para Nivel ${lvl.level + 1} — ${lvl.nextName}`
                : "¡Nivel máximo alcanzado!"}
            </div>
          )}
        </div>
      </section>

      {/* Roadmap de niveles */}
      <section className="rounded-3xl bg-paper border border-rule-soft p-6 mb-6 overflow-x-auto">
        <h2 className="font-display font-bold text-lg mb-5">Roadmap de niveles</h2>
        <div className="flex items-center gap-1 min-w-fit pb-2">
          {LEVEL_ROADMAP.map((node, i) => {
            const completed = node.level < lvl.level;
            const current = node.level === lvl.level;
            const last = i === LEVEL_ROADMAP.length - 1;
            return (
              <div key={node.level} className="flex items-center gap-1 shrink-0">
                <div className="flex flex-col items-center group relative">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-sm transition-all duration-300 ${
                      current
                        ? "scale-110 shadow-lg"
                        : completed
                          ? "bg-accent text-[#FBF1EF]"
                          : "bg-paper-2 text-ink-softer"
                    }`}
                    style={
                      current
                        ? {
                            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                            color: "#FBF1EF",
                            boxShadow: "0 0 0 4px var(--accent-soft), 0 8px 24px var(--accent-glow)",
                            animation: "pomo-gem-glow 2.5s ease-in-out infinite",
                          }
                        : undefined
                    }
                  >
                    {completed ? "✓" : !completed && !current ? "🔒" : String(node.level).padStart(2, "0")}
                  </div>
                  <div className={`mt-1.5 text-[10.5px] font-semibold ${current ? "text-accent" : "text-ink-soft"}`}>
                    {node.name}
                  </div>
                  <div className="absolute top-full mt-2 px-3 py-2 rounded-lg bg-ink text-bg text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-10 shadow-lg">
                    {node.benefit}
                  </div>
                </div>
                {!last && (
                  <div className={`w-6 h-0.5 ${completed ? "bg-accent" : "bg-rule"}`} />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Racha + heatmap */}
        <section className="lg:col-span-2 rounded-3xl bg-paper border border-rule-soft p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg">🔥 Racha</h2>
            <span className="text-[12.5px] text-ink-soft">
              Tu mejor: <strong className="text-ink">{user.longest_streak}d</strong>
            </span>
          </div>

          <div className="flex items-end gap-8 mb-6">
            <div>
              <div
                className="font-display font-extrabold text-6xl leading-none"
                style={{
                  background: "linear-gradient(135deg, var(--accent), #f4c969)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                <AnimatedNumber value={user.current_streak} stiffness={50} damping={14} />
              </div>
              <div className="text-[11.5px] uppercase tracking-[0.12em] text-ink-soft mt-1">
                Días seguidos
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] text-ink-soft mb-1">Próximo hito</div>
              <div className="font-semibold text-sm">
                {user.current_streak >= 30
                  ? "Récord máximo — ¡seguí así!"
                  : `${Math.max(0, 7 - user.current_streak)} días para Racha 7`}
              </div>
            </div>
          </div>

          <div className="grid grid-rows-7 grid-flow-col gap-1 max-w-md">
            {data.streakHeatmap.map((d) => (
              <div
                key={d.date}
                className={`w-3.5 h-3.5 rounded-[3px] ${heatTone(d.count)} transition-all hover:scale-125`}
                title={`${d.date}: ${d.count} min`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 mt-3 text-[10.5px] text-ink-soft">
            <span>Menos</span>
            {HEATMAP_TONES.map((c, i) => (
              <span key={i} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
            ))}
            <span>Más</span>
          </div>
        </section>

        {/* Ranking semanal */}
        <section className="rounded-3xl bg-paper border border-rule-soft p-6">
          <h2 className="font-display font-bold text-lg mb-1">Ranking semanal</h2>
          <p className="text-[11.5px] text-ink-soft mb-5">Top 5 · datos de ejemplo</p>

          <div className="space-y-2">
            {RANKING.map((r) => (
              <div
                key={r.rank}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  r.isMe
                    ? "bg-accent-soft border border-accent/20"
                    : "hover:bg-paper-warm"
                }`}
              >
                <span className="w-7 h-7 rounded-full font-display font-bold text-[11px] flex items-center justify-center bg-paper-2 text-ink shrink-0">
                  {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
                </span>
                <span className={`flex-1 text-[13px] truncate ${r.isMe ? "font-bold" : ""}`}>
                  {r.name} {r.isMe && <span className="text-[10px] text-accent font-bold">(vos)</span>}
                </span>
                <span className="font-display font-bold text-[12.5px] num text-accent">
                  {r.xp} XP
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Insignias grid — game-like */}
      <section className="rounded-3xl bg-paper border border-rule-soft p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display font-bold text-lg">Insignias</h2>
          <span className="px-3 py-1 rounded-full bg-accent text-[#FBF1EF] text-[11px] font-bold">
            {data.achievements.filter((x) => x.unlocked).length}/{data.achievements.length}
          </span>
        </div>
        <p className="text-[11.5px] text-ink-soft mb-6">
          {data.achievements.filter((x) => x.unlocked).length} desbloqueadas de{" "}
          {data.achievements.length}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.achievements.map((b) => (
            <div
              key={b.key}
              className={`group rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden cursor-default ${
                b.unlocked
                  ? "bg-paper-warm border-accent/20 hover:-translate-y-1 hover:shadow-card"
                  : "bg-bg border-dashed border-rule-soft opacity-60"
              }`}
            >
              {/* Glow para insignias desbloqueadas */}
              {b.unlocked && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-60 transition-opacity"
                  style={{ background: "radial-gradient(circle, var(--accent-glow), transparent)" }}
                />
              )}

              <div className={`text-3xl mb-2 transition-transform group-hover:scale-110 ${b.unlocked ? "" : "grayscale"}`}>
                {b.unlocked ? b.icon : "🔒"}
              </div>
              <div className="font-display font-semibold text-[13px] truncate">{b.title}</div>
              <div className="text-[11px] text-ink-soft mt-0.5">{b.description}</div>
              {!b.unlocked && b.progress && (
                <div className="mt-2 text-[10.5px] text-accent font-semibold">{b.progress}</div>
              )}
              {b.unlocked && (
                <div className="mt-2 text-[10px] text-success font-bold uppercase tracking-wide">
                  ✓ Desbloqueada
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
