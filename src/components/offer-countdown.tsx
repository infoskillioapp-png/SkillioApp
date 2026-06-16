"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useUpgradeModal } from "./upgrade-modal";

// Duración de la "oferta de lanzamiento". El reloj es urgencia psicológica:
// cuando llega a 0 el precio NO cambia (sigue $16.000), el contador solo
// desaparece. Single source of truth para todo el paywall.
// 1h para apretar la urgencia (arranca con offer_started_at al completar
// onboarding; aplica a usuarios nuevos — los viejos que ya pasaron 1h no la ven).
export const OFFER_DURATION_HOURS = 1;
const OFFER_DURATION_MS = OFFER_DURATION_HOURS * 60 * 60 * 1000;

type Countdown = {
  /** El cliente ya montó y calculó (evita mismatch de hidratación). */
  ready: boolean;
  /** Hay una oferta activa (tiene inicio y todavía no venció). */
  active: boolean;
  /** Tenía oferta pero ya venció. */
  expired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  /** "11:42:18" listo para pintar. */
  hms: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Cuenta regresiva de la oferta a partir del ISO de `offer_started_at`.
 * Calcula el restante en el cliente cada segundo. Si `startedAt` es null
 * (usuario viejo sin la columna, o algo raro) nunca se activa.
 */
export function useOfferCountdown(startedAt: string | null): Countdown {
  // mounted: false en server, true en cliente. Sin setState-en-effect y sin
  // mismatch de hidratación (el server siempre renderiza el estado "inactivo").
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const hasStart = Number.isFinite(startMs);
  const remaining = hasStart ? startMs + OFFER_DURATION_MS - now : 0;

  const active = mounted && hasStart && remaining > 0;
  const expired = mounted && hasStart && remaining <= 0;

  const clamped = Math.max(0, remaining);
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);

  return {
    ready: mounted,
    active,
    expired,
    hours,
    minutes,
    seconds,
    hms: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  };
}

/**
 * Pill compacto para el topbar. Solo aparece para free con oferta vigente.
 * Sólido + pulso para que se note al navegar. Click → paywall.
 */
export function OfferCountdownPill({ startedAt }: { startedAt: string | null }) {
  const upgrade = useUpgradeModal();
  const { active, hms } = useOfferCountdown(startedAt);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => upgrade.open()}
      className="animate-skillio-pulse-glow motion-reduce:animate-none flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold text-[#FBF1EF] transition hover:opacity-90 active:scale-95"
      style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
      aria-label="Oferta de lanzamiento por tiempo limitado"
      title="Precio de lanzamiento por tiempo limitado"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5 shrink-0">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline uppercase tracking-[0.1em] text-[10px]">Oferta</span>
      <span className="num tabular-nums">{hms}</span>
    </button>
  );
}

/**
 * Banner destacado para el tope del dashboard. Lo primero que ve el free al
 * entrar: dígitos grandes, gradiente terracota, ancla de precio y CTA al
 * paywall. Solo se renderiza con oferta vigente. Los dos puntos parpadean
 * (efecto countdown clásico); se desactiva con prefers-reduced-motion.
 */
export function OfferBanner({ startedAt }: { startedAt: string | null }) {
  const upgrade = useUpgradeModal();
  const { active, hours, minutes, seconds } = useOfferCountdown(startedAt);

  if (!active) return null;

  return (
    <div
      className="relative overflow-hidden rounded-3xl mb-7 px-5 py-5 sm:px-7 sm:py-6 shadow-[0_14px_40px_var(--accent-glow)]"
      style={{ background: "linear-gradient(120deg, var(--accent) 0%, var(--accent-2) 70%, #c47b2b 130%)" }}
    >
      {/* halo decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 w-60 h-60 rounded-full blur-3xl opacity-30"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.55), transparent 60%)" }}
      />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        {/* Izquierda: contador */}
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-[#FBF1EF] text-[10.5px] font-bold tracking-[0.16em] uppercase mb-2 opacity-95">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2.5M9 2h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Precio de lanzamiento · termina en
          </div>
          <div className="flex items-center justify-center md:justify-start gap-1.5 sm:gap-2.5">
            <TimeBlock value={hours} label="HS" />
            <Colon />
            <TimeBlock value={minutes} label="MIN" />
            <Colon />
            <TimeBlock value={seconds} label="SEG" />
          </div>
        </div>

        {/* Derecha: precio + CTA */}
        <div className="flex flex-col items-center md:items-end gap-2.5">
          <div className="flex items-baseline gap-2 text-[#FBF1EF]">
            <span className="text-[15px] line-through opacity-70 num">$29.999</span>
            <span className="font-display font-extrabold text-3xl tracking-[-0.03em] num">$16.000</span>
            <span className="text-[12px] opacity-80">/ mes</span>
          </div>
          <button
            type="button"
            onClick={() => upgrade.open()}
            className="px-7 py-3 rounded-full bg-[#FBF1EF] text-accent font-display font-extrabold text-[14px] shadow-lg hover:bg-white transition active:translate-y-[1px] w-full md:w-auto"
          >
            Activar PRO →
          </button>
        </div>
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="num tabular-nums font-display font-extrabold text-4xl sm:text-5xl leading-none text-[#FBF1EF] px-2.5 sm:px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(0,0,0,0.18)" }}
      >
        {pad(value)}
      </span>
      <span className="text-[9px] font-bold tracking-[0.14em] text-[#FBF1EF] opacity-75 mt-1.5">{label}</span>
    </div>
  );
}

function Colon() {
  return (
    <span className="animate-skillio-blink motion-reduce:animate-none font-display font-extrabold text-3xl sm:text-4xl text-[#FBF1EF] opacity-80 -mt-3">
      :
    </span>
  );
}
