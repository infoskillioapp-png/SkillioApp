"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlowButton } from "@/components/cult/glow-button";
import { AnimatedNumber } from "@/components/cult/animated-number";

type Mode = "focus" | "short_break" | "long_break";

type ModeStyle = {
  label: string;
  defaultMin: number;
  emoji: string;
  primary: string;
  secondary: string;
  glow: string;
  tint: string;
  gradId: string;
};

const MODE_INFO: Record<Mode, ModeStyle> = {
  focus: {
    label: "Foco",
    defaultMin: 25,
    emoji: "🍅",
    primary: "#a5402d",
    secondary: "#c56450",
    glow: "rgba(165, 64, 45, 0.32)",
    tint: "rgba(165, 64, 45, 0.06)",
    gradId: "pomo-grad-focus",
  },
  short_break: {
    label: "Descanso",
    defaultMin: 5,
    emoji: "☕",
    primary: "#4a6b8a",
    secondary: "#7da7c7",
    glow: "rgba(74, 107, 138, 0.3)",
    tint: "rgba(74, 107, 138, 0.06)",
    gradId: "pomo-grad-short",
  },
  long_break: {
    label: "Descanso largo",
    defaultMin: 15,
    emoji: "🌿",
    primary: "#4a7c59",
    secondary: "#75a98a",
    glow: "rgba(74, 124, 89, 0.3)",
    tint: "rgba(74, 124, 89, 0.06)",
    gradId: "pomo-grad-long",
  },
};

const GEMS_COUNT = 4;
const CONFETTI_COLORS = ["#f4c969", "#d49a3a", "#a5402d", "#c56450", "#4a7c59", "#fce69a", "#ffffff"];

function fmt(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function getMotivationalMessage(remaining: number, total: number, mode: Mode): string | null {
  if (mode !== "focus") return null;
  const pct = remaining / total;
  if (remaining === 0) return null;
  if (remaining <= 60) return "¡ÚLTIMO MINUTO! ¡No pares!";
  if (pct <= 0.2) return "¡Ya falta poquísimo! Aguantá";
  if (pct <= 0.5 && pct > 0.49) return "¡Vas a la mitad! Seguí así";
  if (pct <= 0.25) return "¡Casi llegás! No abandones ahora";
  return null;
}

type Particle = { tx: number; ty: number; color: string; delay: number; size: number };

function makeParticles(count = 28): Particle[] {
  return Array.from({ length: count }).map(() => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 100 + Math.random() * 120;
    return {
      tx: Math.cos(angle) * dist,
      ty: Math.sin(angle) * dist - 50,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.25,
      size: 5 + Math.random() * 8,
    };
  });
}

type Celebration = { xp: number; particles: Particle[] };

export function Pomodoro({ focusToday }: { focusToday: number }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("focus");
  const [duration, setDuration] = useState(MODE_INFO.focus.defaultMin);
  const [remaining, setRemaining] = useState(MODE_INFO.focus.defaultMin * 60);
  const [running, setRunning] = useState(false);
  const [posting, setPosting] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [motivMsg, setMotivMsg] = useState<string | null>(null);
  const [motivKey, setMotivKey] = useState(0);
  const completedRef = useRef(false);
  const style = MODE_INFO[mode];
  const totalSecs = duration * 60;

  function changeMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setRunning(false);
    setDuration(MODE_INFO[next].defaultMin);
    setRemaining(MODE_INFO[next].defaultMin * 60);
    setMotivMsg(null);
  }

  function adjust(deltaMin: number) {
    const nextDur = Math.max(1, Math.min(60, duration + deltaMin));
    if (nextDur === duration) return;
    setDuration(nextDur);
    if (!running) setRemaining(nextDur * 60);
  }

  function toggleRun() {
    if (remaining <= 0) setRemaining(duration * 60);
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setRemaining(duration * 60);
    setMotivMsg(null);
  }

  // Countdown
  useEffect(() => {
    if (!running) return;
    completedRef.current = false;
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          completedRef.current = true;
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  // Motivational messages at key moments
  useEffect(() => {
    if (!running) return;
    const msg = getMotivationalMessage(remaining, totalSecs, mode);
    if (msg) {
      setMotivMsg(msg);
      setMotivKey((k) => k + 1);
    }
  }, [remaining, running, totalSecs, mode]);

  // On complete
  useEffect(() => {
    if (remaining !== 0 || !completedRef.current || posting) return;
    setRunning(false);
    setPosting(true);
    const body = { mode, duration_minutes: duration };
    fetch("/api/pomodoro/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data: { ok: boolean; xp_earned?: number }) => {
        if (data?.xp_earned && data.xp_earned > 0) {
          setCelebration({ xp: data.xp_earned, particles: makeParticles() });
          window.setTimeout(() => {
            setCelebration(null);
            setMotivMsg(null);
          }, 3500);
        }
        router.refresh();
      })
      .catch((e) => console.error("[pomodoro] complete error", e))
      .finally(() => {
        setPosting(false);
        completedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const progress = duration > 0 ? remaining / totalSecs : 0;
  const radius = 90;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * progress;
  const todayGem = focusToday % GEMS_COUNT;

  const isLastMinute = running && remaining <= 60 && remaining > 0 && mode === "focus";

  return (
    <div className="relative rounded-3xl bg-paper border border-rule-soft p-5 sm:p-8 shadow-card overflow-hidden">
      {/* Tint de modo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-colors duration-500"
        style={{ backgroundColor: style.tint }}
      />

      {/* Halo de respiración */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full blur-3xl transition-opacity duration-700"
        style={{
          background: `radial-gradient(circle, ${style.glow}, transparent 60%)`,
          opacity: running ? 0.85 : 0.3,
          animation: running ? "pomo-breathe 4.5s ease-in-out infinite" : undefined,
        }}
      />

      <div className="relative flex flex-col items-center">
        {/* TABS de modo */}
        <div className="inline-flex p-1 rounded-full bg-paper-warm/70 backdrop-blur-sm border border-rule-soft text-[11px] sm:text-[12.5px] mb-5 sm:mb-7">
          {(Object.keys(MODE_INFO) as Mode[]).map((m) => {
            const isActive = mode === m;
            const ms = MODE_INFO[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                className={cn(
                  "px-2.5 sm:px-4 py-1.5 rounded-full font-semibold transition-all duration-500 cursor-pointer",
                  isActive ? "text-ink" : "text-ink-soft/60 hover:text-ink",
                )}
                style={
                  isActive
                    ? {
                        backgroundColor: "var(--paper)",
                        boxShadow: `0 10px 28px ${ms.glow}, 0 2px 6px rgba(53, 56, 49, 0.05)`,
                      }
                    : undefined
                }
              >
                <span className="mr-1">{ms.emoji}</span>
                {ms.label}
              </button>
            );
          })}
        </div>

        {/* Mensaje motivador */}
        <div className="h-7 mb-3 flex items-center justify-center">
          {motivMsg && (
            <div
              key={motivKey}
              className={cn(
                "px-4 py-1 rounded-full text-[12px] font-bold tracking-wide animate-skillio-fade-in",
                isLastMinute
                  ? "bg-[#a5402d] text-[#FBF1EF] animate-skillio-pulse-glow"
                  : "bg-accent-soft text-accent border border-accent/20"
              )}
            >
              {motivMsg}
            </div>
          )}
        </div>

        {/* TIMER + botones flotantes ±5 */}
        <div className="group/timer relative flex items-center justify-center gap-2 sm:gap-4 mb-5 sm:mb-7">
          <button
            type="button"
            onClick={() => adjust(-5)}
            disabled={duration <= 1}
            aria-label="Restar 5 minutos"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-rule/50 bg-paper/40 backdrop-blur-sm text-ink-soft hover:text-accent hover:border-accent hover:bg-paper transition-all duration-300 flex items-center justify-center text-[11px] sm:text-[13px] font-semibold opacity-30 group-hover/timer:opacity-100 disabled:opacity-15 disabled:cursor-not-allowed"
          >
            −5
          </button>

          {/* CÍRCULO SVG */}
          <div className="relative w-[210px] h-[210px] sm:w-[280px] sm:h-[280px]">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full -rotate-90"
              style={{
                filter: `drop-shadow(0 0 24px ${style.glow})`,
                transition: "filter .5s ease",
              }}
            >
              <defs>
                {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
                  <linearGradient key={m} id={MODE_INFO[m].gradId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={MODE_INFO[m].primary} />
                    <stop offset="100%" stopColor={MODE_INFO[m].secondary} />
                  </linearGradient>
                ))}
              </defs>
              {/* Pista */}
              <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--rule)" strokeWidth="5" />
              {/* Progreso */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={`url(#${style.gradId})`}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear, stroke .5s ease" }}
              />
            </svg>

            {/* Centro clickable */}
            <button
              type="button"
              onClick={toggleRun}
              aria-label={running ? "Pausar" : "Iniciar"}
              className="absolute inset-0 group/center flex flex-col items-center justify-center cursor-pointer rounded-full focus:outline-none"
            >
              <div
                className={cn(
                  "font-display font-bold text-[52px] sm:text-[68px] leading-none tabular-nums tracking-[-0.04em] transition-all duration-300 group-hover/center:scale-[0.94]",
                  celebration && "opacity-20",
                  isLastMinute && "text-[#a5402d]"
                )}
              >
                {fmt(remaining)}
              </div>
              <div className="relative h-5 mt-2 w-full flex items-center justify-center">
                <div
                  className={cn(
                    "absolute text-[11.5px] uppercase tracking-[0.14em] text-ink-soft transition-opacity duration-300 group-hover/center:opacity-0",
                    celebration && "opacity-0",
                  )}
                >
                  {style.label} · {duration} min
                </div>
                <div
                  className="absolute opacity-0 group-hover/center:opacity-100 transition-opacity duration-300 flex items-center gap-1.5 text-[11.5px] uppercase tracking-[0.14em] font-bold"
                  style={{ color: style.primary }}
                >
                  {running ? <PauseIcon /> : <PlayIcon />}
                  {running ? "Pausar" : "Iniciar"}
                </div>
              </div>
            </button>

            {/* Celebración */}
            {celebration && (
              <div className="pointer-events-none absolute inset-0 z-10">
                <div
                  className="absolute left-1/2 top-1/2 font-display font-extrabold text-[48px] sm:text-[56px] flex items-center gap-2 whitespace-nowrap"
                  style={{
                    color: style.primary,
                    animation: "pomo-xp-float 3.2s cubic-bezier(.22,1,.36,1) forwards",
                    filter: `drop-shadow(0 4px 18px ${style.glow})`,
                  }}
                >
                  <LightningIcon className="w-8 h-8" />
                  +<AnimatedNumber value={celebration.xp} stiffness={60} damping={12} />
                  {" "}XP
                </div>
                {celebration.particles.map((p, i) => (
                  <span
                    key={i}
                    className="absolute rounded-full"
                    style={
                      {
                        left: "50%",
                        top: "50%",
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        boxShadow: `0 0 10px ${p.color}`,
                        animation: "pomo-confetti 2s ease-out forwards",
                        animationDelay: `${p.delay}s`,
                        "--tx": `${p.tx}px`,
                        "--ty": `${p.ty}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => adjust(5)}
            disabled={duration >= 60}
            aria-label="Sumar 5 minutos"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-rule/50 bg-paper/40 backdrop-blur-sm text-ink-soft hover:text-accent hover:border-accent hover:bg-paper transition-all duration-300 flex items-center justify-center text-[11px] sm:text-[13px] font-semibold opacity-30 group-hover/timer:opacity-100 disabled:opacity-15 disabled:cursor-not-allowed"
          >
            +5
          </button>
        </div>

        {/* CONTROLES */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={reset}
            aria-label="Reiniciar"
            className="w-11 h-11 rounded-full border border-rule bg-paper text-ink-soft hover:text-accent hover:border-accent hover:rotate-180 transition-all duration-500 flex items-center justify-center cursor-pointer"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4">
              <path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <GlowButton
            onClick={toggleRun}
            glowColor={style.glow}
            className="text-[#FBF1EF] text-sm"
            style={{
              backgroundColor: style.primary,
              boxShadow: running
                ? `0 12px 32px ${style.glow}`
                : `0 8px 24px ${style.glow}`,
            }}
          >
            {running ? "Pausar" : remaining === totalSecs ? "¡Arrancar!" : "Continuar"}
          </GlowButton>
        </div>

        {/* GEMAS (ciclos hoy) */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="flex items-center gap-3">
            {Array.from({ length: GEMS_COUNT }).map((_, i) => (
              <Gem
                key={i}
                state={i < todayGem ? "filled" : i === todayGem && running ? "current" : "empty"}
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-softer font-semibold uppercase tracking-[0.1em]">
            {todayGem} de {GEMS_COUNT} sesiones hoy
          </span>
        </div>

        {/* XP hint */}
        <div className="text-[12px] text-ink-soft text-center px-5 py-2.5 rounded-full bg-accent-softer border border-rule-soft inline-flex items-center gap-2">
          <LightningIcon className="w-3.5 h-3.5 text-accent" />
          <span className="font-bold text-accent num">50 XP</span>
          <span>por sesión completada</span>
        </div>
      </div>
    </div>
  );
}

function Gem({ state }: { state: "empty" | "current" | "filled" }) {
  const filled = state === "filled";
  const current = state === "current";
  return (
    <svg
      viewBox="0 0 28 28"
      className="w-8 h-8"
      style={{
        transition: "transform .3s ease",
        animation: filled ? "pomo-gem-pop .55s cubic-bezier(.34,1.56,.64,1) both" : undefined,
      }}
      aria-hidden
    >
      <defs>
        <linearGradient id="pomo-gem-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fce69a" />
          <stop offset="55%" stopColor="#f4c969" />
          <stop offset="100%" stopColor="#d49a3a" />
        </linearGradient>
        <filter id="gem-glow-filter">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M14 2 L24 10 L14 26 L4 10 Z"
        fill={filled ? "url(#pomo-gem-gold)" : "transparent"}
        stroke={filled ? "#b97f1f" : current ? "var(--accent)" : "var(--rule)"}
        strokeWidth={filled ? "1.5" : current ? "2" : "1.5"}
        strokeLinejoin="round"
        filter={filled ? "url(#gem-glow-filter)" : undefined}
        style={
          filled
            ? { animation: "pomo-gem-glow 2.6s ease-in-out infinite" }
            : current
              ? { filter: "drop-shadow(0 0 6px var(--accent-glow))" }
              : undefined
        }
      />
      {filled && (
        <path d="M9 7 L14 2 L19 7 L14 10.5 Z" fill="rgba(255,255,255,0.5)" />
      )}
      {current && (
        <circle cx="14" cy="14" r="3" fill="var(--accent)" opacity="0.4">
          <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
    </svg>
  );
}

function PlayIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function LightningIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 L13 2 Z" />
    </svg>
  );
}
