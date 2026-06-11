"use client";

import { useEffect, useState } from "react";
import { useUpgradeModal } from "./upgrade-modal";

// Duración de la "oferta de lanzamiento". El reloj es urgencia psicológica:
// cuando llega a 0 el precio NO cambia (sigue $16.000), el contador solo
// desaparece. Single source of truth para todo el paywall.
export const OFFER_DURATION_HOURS = 12;
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
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setMounted(true);
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
 * Al clickear abre el paywall. Mientras no haya oferta o ya venció: nada.
 */
export function OfferCountdownPill({ startedAt }: { startedAt: string | null }) {
  const upgrade = useUpgradeModal();
  const { active, hms } = useOfferCountdown(startedAt);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={() => upgrade.open()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition hover:opacity-90 active:scale-95"
      style={{
        background: "var(--accent-softer)",
        color: "var(--accent)",
        border: "1px solid var(--accent)",
      }}
      aria-label="Oferta de lanzamiento por tiempo limitado"
      title="Precio de lanzamiento por tiempo limitado"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 shrink-0">
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="num tabular-nums">{hms}</span>
    </button>
  );
}
