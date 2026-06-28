"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Public constants & helpers ───────────────────────────────────────────────

export const TOUR_KEY = "skillio_tour_v1";

/** Mark the tour as finished from any page (e.g. after generation completes). */
export function markTourDone() {
  if (typeof window !== "undefined") localStorage.setItem(TOUR_KEY, "done");
}

/** Returns true (client-side) when the tour has never been seen. */
export function useTourRequired(key: string = TOUR_KEY): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(key)) setShow(true);
  }, [key]);
  return show;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type TourStep = {
  /** Small icon rendered inside the colored circle */
  icon: React.ReactNode;
  title: string;
  body: string;
  /**
   * CSS selector of the element to spotlight.
   * Add  data-tour="step-id"  on the target element and pass e.g. '[data-tour="upload-btn"]'.
   * Omit (or set placement:"center") for a centered modal step with no spotlight.
   */
  target?: string;
  placement?: "center" | "bottom" | "top" | "right" | "left";
  /** Label for the primary Siguiente button (default "Proximo") */
  nextLabel?: string;
  /** Called right before advancing to the next step */
  onNext?: () => void;
  /** Optional secondary CTA (e.g. "Usar apunte demo") */
  extra?: { label: string; action: () => void };
};

interface Props {
  steps: TourStep[];
  /** Defaults to TOUR_KEY. Pass a page-specific key to track home vs espacio tours separately. */
  storageKey?: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

// ─── Inline icons (no external import needed) ────────────────────────────────

export const TourIconSparkles = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M5 3l.8 2.4L8 6l-2.2.8L5 9l-.8-2.2L2 6l2.2-.8z" />
    <path d="M19 15l.8 2.4L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);

export const TourIconUpload = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

export const TourIconBolt = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const TourIconTrophy = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3a6 6 0 0 0 6 6 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2h-3" />
    <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);

export const TourIconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

const CARD_W = 316;
const SPOT_PAD = 10;
const GAP = 18;

export function OnboardingTour({ steps, storageKey = TOUR_KEY, onComplete, onSkip }: Props) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const cur = steps[idx];

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Track spotlight target rect
  useEffect(() => {
    if (!cur?.target || isMobile || cur.placement === "center") {
      setSpotRect(null);
      return;
    }
    const el = document.querySelector(cur.target) as HTMLElement | null;
    if (!el) { setSpotRect(null); return; }

    const update = () => setSpotRect(el.getBoundingClientRect());
    update();

    const ro = new ResizeObserver(update);
    ro.observe(document.documentElement);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", update, true);
    };
  }, [idx, cur?.target, cur?.placement, isMobile]);

  // Block background clicks — allow clicks inside spotlight or tour card
  useEffect(() => {
    if (!visible) return;
    const block = (e: MouseEvent) => {
      const inCard = cardRef.current?.contains(e.target as Node);
      if (inCard) return;
      if (spotRect) {
        const { clientX: x, clientY: y } = e;
        const inSpot =
          x >= spotRect.left - SPOT_PAD && x <= spotRect.right + SPOT_PAD &&
          y >= spotRect.top  - SPOT_PAD && y <= spotRect.bottom + SPOT_PAD;
        if (inSpot) return;
      }
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener("click", block, true);
    return () => document.removeEventListener("click", block, true);
  }, [visible, spotRect]);

  const finish = useCallback((mode: "done" | "skipped") => {
    localStorage.setItem(storageKey, mode);
    setVisible(false);
    mode === "done" ? onComplete?.() : onSkip?.();
  }, [onComplete, onSkip]);

  const next = useCallback(() => {
    cur?.onNext?.();
    if (idx < steps.length - 1) {
      setIdx(i => i + 1);
    } else {
      finish("done");
    }
  }, [cur, idx, steps.length, finish]);

  if (!visible || !steps.length) return null;

  // ── Card positioning ────────────────────────────────────────────────────────
  const cardStyle = (): React.CSSProperties => {
    if (!spotRect || isMobile || !cur.target || cur.placement === "center") {
      return { top: "50%", left: "50%", transform: "translate(-50%,-50%)" };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = spotRect.left + spotRect.width / 2;
    const safeLeft = Math.max(12, Math.min(cx - CARD_W / 2, vw - CARD_W - 12));

    switch (cur.placement ?? "bottom") {
      case "bottom": return { top: Math.min(spotRect.bottom + GAP, vh - 300), left: safeLeft };
      case "top":    return { bottom: vh - spotRect.top + GAP, left: safeLeft };
      case "right":  return { top: Math.max(12, Math.min(spotRect.top, vh - 280)), left: Math.min(spotRect.right + GAP, vw - CARD_W - 12) };
      case "left":   return { top: Math.max(12, Math.min(spotRect.top, vh - 280)), right: vw - spotRect.left + GAP };
      default:       return { top: spotRect.bottom + GAP, left: safeLeft };
    }
  };

  return (
    <>
      {/* Dark overlay — transparent background when spotlight is active (shadow handles darkening) */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 9970,
          background: spotRect ? "transparent" : "rgba(15,8,40,0.62)",
          pointerEvents: spotRect ? "none" : "all",
          transition: "background 350ms ease",
        }}
      />

      {/* Spotlight ring — box-shadow creates the dark veil with a bright cutout */}
      {spotRect && (
        <div
          key={`spot-${idx}`}
          aria-hidden
          style={{
            position: "fixed", zIndex: 9971, pointerEvents: "none",
            top:    spotRect.top    - SPOT_PAD,
            left:   spotRect.left   - SPOT_PAD,
            width:  spotRect.width  + SPOT_PAD * 2,
            height: spotRect.height + SPOT_PAD * 2,
            borderRadius: 14,
            boxShadow: "0 0 0 9999px rgba(15,8,40,0.62)",
            border: "2px solid rgba(124,58,237,0.80)",
            animation: "tourSpot 0.30s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        />
      )}

      {/* Tour card */}
      <div
        key={`card-${idx}`}
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={cur.title}
        style={{
          position: "fixed",
          zIndex: 9980,
          width: CARD_W,
          maxWidth: "calc(100vw - 32px)",
          ...cardStyle(),
          background: "#fff",
          borderRadius: 20,
          padding: "20px 20px 16px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.12)",
          fontFamily: "var(--font-jakarta, system-ui, sans-serif)",
          animation: "tourCard 0.26s ease both",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: "rgba(124,58,237,0.10)", color: "#7c3aed",
              display: "grid", placeItems: "center",
            }}>
              {cur.icon}
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#1f2347", lineHeight: 1.3 }}>
              {cur.title}
            </span>
          </div>
          <button
            onClick={() => finish("skipped")}
            aria-label="Saltar tour"
            style={{
              width: 26, height: 26, borderRadius: 999,
              border: "none", background: "rgba(15,8,40,0.07)",
              cursor: "pointer", color: "#94a3b8",
              display: "grid", placeItems: "center", flexShrink: 0,
              fontSize: 12,
            }}
          >
            &#x2715;
          </button>
        </div>

        {/* Body text */}
        <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#64748b", margin: "0 0 14px" }}>
          {cur.body}
        </p>

        {/* Optional extra CTA (e.g. "Usar apunte demo") */}
        {cur.extra && (
          <button
            onClick={cur.extra.action}
            style={{
              display: "block", width: "100%",
              padding: "9px 14px", borderRadius: 10,
              border: "1.5px solid rgba(124,58,237,0.28)",
              background: "rgba(124,58,237,0.06)", color: "#7c3aed",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", marginBottom: 10,
              transition: "background 150ms ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.06)"; }}
          >
            {cur.extra.label}
          </button>
        )}

        {/* Footer: progress dots + next button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

          {/* Progress indicators */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  height: 6,
                  width: i === idx ? 18 : 6,
                  borderRadius: 999,
                  background: i < idx ? "#c4b5fd" : i === idx ? "#7c3aed" : "#e2e8f0",
                  transition: "width 280ms ease, background 280ms ease",
                }}
              />
            ))}
            <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>
              {idx + 1} de {steps.length}
            </span>
          </div>

          {/* Primary action */}
          <button
            onClick={next}
            style={{
              padding: "9px 18px", borderRadius: 999,
              border: "none", background: "#7c3aed", color: "#fff",
              fontWeight: 700, fontSize: 13.5, cursor: "pointer",
              fontFamily: "inherit",
              display: "inline-flex", alignItems: "center", gap: 5,
              boxShadow: "0 4px 14px rgba(124,58,237,0.38)",
              transition: "transform 120ms ease, box-shadow 120ms ease",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 18px rgba(124,58,237,0.48)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 14px rgba(124,58,237,0.38)"; }}
          >
            {idx === steps.length - 1
              ? "Entendido"
              : (cur.nextLabel ?? "Proximo ›")}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tourSpot {
          from { opacity: 0; transform: scale(0.90); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes tourCard {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="tourSpot"], [style*="tourCard"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}
