"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { levelProgress } from "@/lib/level";
import type { SkillioUser } from "@/lib/sync-user";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { AnimatedNumber } from "@/components/cult/animated-number";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  proPill?: boolean;
};

const ICON = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M3 11L12 3l9 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20h5v-5h4v5h5V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  agenda: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  materias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M4 5.5a2 2 0 0 1 2-2h11.5v15H6a2 2 0 0 0-2 2v-15z" />
      <path d="M8 7.5h7M8 11h5" strokeLinecap="round" />
    </svg>
  ),
  logros: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M7 3.5h10v4a5 5 0 0 1-10 0v-4z" />
      <path d="M7 5H4.5v2A2.5 2.5 0 0 0 7 9.5M17 5h2.5v2a2.5 2.5 0 0 1-2.5 2.5M10 14.5h4l-.5 4h-3z" strokeLinecap="round" />
    </svg>
  ),
  apuntes: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M6 3.5h9l4 4v13H6z" />
      <path d="M15 3.5v4h4M9 12h6M9 15.5h6" strokeLinecap="round" />
    </svg>
  ),
  ia: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <path d="M12 3.5l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5L5.5 10l4.5-2z" />
      <path d="M18.5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" strokeLinecap="round" />
    </svg>
  ),
  comunidad: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
      <circle cx="9" cy="9" r="3.5" />
      <circle cx="17" cy="11" r="2.5" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 18.5c.4-2 2-3.5 4.5-3.5s4 1.5 4 3.5" strokeLinecap="round" />
    </svg>
  ),
};

const PRINCIPAL: NavItem[] = [
  { href: "/app", label: "Inicio", icon: ICON.dashboard },
  { href: "/app/agenda", label: "Agenda", icon: ICON.agenda, badge: "3" },
  { href: "/app/materias", label: "Mis materias", icon: ICON.materias },
  { href: "/app/logros", label: "Logros", icon: ICON.logros },
];

const HERRAMIENTAS: NavItem[] = [
  // "Aprobá con IA" es la sección estrella (subir apunte + generar en un solo
  // lugar). Antes "IA Premium" hacía pensar que estaba bloqueada en el trial.
  { href: "/app/ia", label: "Aprobá con IA", icon: ICON.ia },
  { href: "/app/apuntes", label: "Mis apuntes", icon: ICON.apuntes },
  { href: "/app/comunidad", label: "Comunidad", icon: ICON.comunidad },
];

export function Sidebar({ user }: { user: SkillioUser }) {
  const pathname = usePathname();
  const upgrade = useUpgradeModal();
  const level = levelProgress(user.total_xp);

  const initials =
    user.full_name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? user.email.slice(0, 2).toUpperCase();

  return (
    <aside className="flex flex-col h-full bg-paper-warm border-r border-rule px-4 py-5 overflow-y-auto">
      {/* HEAD */}
      <div className="flex items-center justify-between px-2 mb-6">
        <Link
          href="/app"
          className="font-display font-bold text-2xl tracking-[-0.03em] flex items-center gap-2"
        >
          <span>
            Skill<span className="text-accent">io</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-skillio-blink" />
        </Link>
      </div>


      {/* SECCION PRINCIPAL */}
      <NavSection title="Principal" items={PRINCIPAL} pathname={pathname} />

      {/* SECCION HERRAMIENTAS */}
      <NavSection
        title="Herramientas"
        items={HERRAMIENTAS}
        pathname={pathname}
      />

      {/* BOTTOM */}
      <div className="mt-auto flex flex-col gap-3 pt-4">
        {/* Pro banner — TextureCard premium */}
        {user.plan === "free" && (
          <button
            type="button"
            onClick={() => upgrade.open()}
            className="group w-full text-left cursor-pointer"
          >
            <div
              className="relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-[1px] hover:shadow-lg"
              style={{
                borderColor: "rgba(165,64,45,0.35)",
                background: "linear-gradient(135deg, #1a0f0c 0%, #2a1510 40%, #1e1208 100%)",
              }}
            >
              {/* Capa de textura multi-borde */}
              <div className="absolute inset-0 rounded-2xl border border-white/[0.04]" />
              <div className="absolute inset-[1px] rounded-[calc(0.75rem-1px)] border border-white/[0.03]" />

              {/* Glow animado */}
              <div
                aria-hidden
                className="pointer-events-none absolute -top-8 -right-6 w-28 h-28 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity"
                style={{ background: "radial-gradient(circle, rgba(165,64,45,0.5), transparent 65%)" }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -left-4 w-20 h-20 rounded-full blur-2xl opacity-30"
                style={{ background: "radial-gradient(circle, rgba(196,123,43,0.4), transparent 65%)" }}
              />

              <div className="relative p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[#FBF1EF] text-[9px] font-bold tracking-[0.16em]"
                    style={{
                      background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                      boxShadow: "0 2px 10px rgba(165,64,45,0.4)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                      <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 L13 2 Z" />
                    </svg>
                    PRO
                  </span>
                </div>
                <div className="font-display font-bold text-[13px] leading-tight mb-1 text-[#FBF1EF]">
                  Estudiá sin límites
                </div>
                <div className="text-[11px] leading-snug mb-3" style={{ color: "rgba(251,241,239,0.55)" }}>
                  IA ilimitada · simulacros · modelos avanzados
                </div>
                <div className="inline-flex items-center gap-1 text-[11.5px] font-bold group-hover:gap-2 transition-all" style={{ color: "#f4c969" }}>
                  Conocer Pro
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </div>
              </div>
            </div>
          </button>
        )}

        {/* Level card mejorada */}
        <div className="rounded-2xl bg-paper border border-rule-soft p-3.5 relative overflow-hidden">
          {level.xpToNext <= 100 && level.xpToNext > 0 && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(165,64,45,0.1) 0%, transparent 70%)" }}
            />
          )}
          <div className="flex items-center justify-between mb-2.5 relative">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-8 h-8 rounded-xl bg-accent text-[#FBF1EF] flex items-center justify-center font-display font-bold text-[12px] transition-all ${level.xpToNext <= 100 && level.xpToNext > 0 ? "animate-skillio-pulse-glow" : ""}`}
                style={level.xpToNext <= 100 && level.xpToNext > 0 ? { boxShadow: "0 0 0 3px rgba(165,64,45,0.2)" } : undefined}
              >
                {String(level.level).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[12.5px] font-semibold leading-tight">{level.name}</div>
                <div className="text-[10.5px] text-ink-soft">Nivel actual</div>
              </div>
            </div>
            <span className="font-display font-bold text-[13px] text-accent num">
              <AnimatedNumber value={user.total_xp} stiffness={60} damping={14} /> XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-rule-soft overflow-hidden relative">
            <div
              className="h-full rounded-full transition-[width] duration-700 relative"
              style={{
                width: `${level.ratio * 100}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                boxShadow: "0 0 8px var(--accent-glow)",
              }}
            >
              <div aria-hidden className="absolute inset-0 overflow-hidden rounded-full">
                <div
                  className="h-full w-8 absolute top-0"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    animation: "xp-shimmer 2.5s ease-in-out infinite",
                  }}
                />
              </div>
            </div>
          </div>
          {level.xpToNext <= 100 && level.xpToNext > 0 && (
            <div className="text-[9.5px] text-warning font-bold mt-1 animate-pulse">⚡ ¡{level.xpToNext} XP para subir!</div>
          )}
        </div>

        {/* User card — abre /app/perfil (datos, facturación, cancelar, salir) */}
        <Link
          href="/app/perfil"
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-paper border border-rule-soft transition-colors hover:bg-paper-warm",
            pathname === "/app/perfil" && "border-accent/40",
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] font-display text-[13px] font-bold text-[#FBF1EF]">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-semibold">
              {user.full_name ?? user.email.split("@")[0]}
            </div>
            <div className="truncate text-[10.5px] text-ink-soft">
              {user.plan === "pro" ? "Mensual" : user.plan === "semanal" ? "Semanal" : "Gratis"} · 🔥 {user.current_streak}d
            </div>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5 shrink-0 text-ink-softer">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="mb-4">
      <div className="px-3 mb-1.5 text-[10.5px] font-semibold text-ink-softer tracking-[0.14em] uppercase">
        {title}
      </div>
      <div className="space-y-0.5">
        {items.map((it) => {
          const active =
            it.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13.5px] font-medium transition w-full text-left relative",
                active
                  ? "bg-paper text-ink shadow-[0_1px_2px_rgba(53,56,49,0.04)] font-semibold"
                  : "text-ink-soft hover:bg-paper hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center transition shrink-0",
                  active
                    ? "bg-accent text-[#FBF1EF]"
                    : "bg-transparent text-ink-soft",
                )}
              >
                <span className="w-3.5 h-3.5 inline-flex">{it.icon}</span>
              </span>
              <span className="truncate">{it.label}</span>
              {it.badge && (
                <span className="ml-auto bg-accent text-[#FBF1EF] text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {it.badge}
                </span>
              )}
              {it.proPill && (
                <span className="ml-auto text-[9.5px] font-bold bg-accent text-[#FBF1EF] px-1.5 py-0.5 rounded">
                  PRO
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
