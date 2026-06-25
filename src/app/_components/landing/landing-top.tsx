"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ============================================================
// ICONS
// ============================================================
type IconProps = { size?: number; stroke?: number };

export const IconMenu = ({ size = 20, stroke = 1.8 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
export const IconClose = ({ size = 20, stroke = 1.8 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
export const IconArrow = ({ size = 16, stroke = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
export const IconShield = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
export const IconCheck = ({ size = 14, stroke = 2 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
export const IconHeart = ({ size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
export const IconDoc = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);
export const IconExam = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="4" rx="1" /><path d="M9 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-3" />
    <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
export const IconFlash = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="3" /><line x1="12" y1="4" x2="12" y2="20" />
    <path d="M9 9l3-1.5L15 9" />
  </svg>
);
export const IconChat = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
export const IconUpload = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
export const IconBolt = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
export const IconTrophy = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3a6 6 0 0 0 6 6 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2h-3" />
    <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" />
  </svg>
);
export const IconSparkles = ({ size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M5 3l.8 2.4L8 6l-2.2.8L5 9l-.8-2.2L2 6l2.2-.8z" />
    <path d="M19 15l.8 2.4L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
  </svg>
);
export const IconCalendar = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
export const IconTomato = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" />
    <path d="M12 5c0-2 1.5-3 3-3M12 5c0-2-1.5-3-3-3" /><path d="M12 5v3" />
  </svg>
);
export const IconBook = ({ size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);
export const IconX = ({ size = 12, stroke = 2.5 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ============================================================
// SKILLIO WORDMARK
// ============================================================
export const SkillioMark = ({ color = "var(--ink)", size = 26 }: { color?: string; size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.32) }}>
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none">
      <defs>
        <linearGradient id="sm-brand" x1="5" y1="2" x2="47" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#865CB8" />
          <stop offset="100%" stopColor="#9655E5" />
        </linearGradient>
        <linearGradient id="sm-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity={0.20} />
          <stop offset="100%" stopColor="white" stopOpacity={0} />
        </linearGradient>
        <clipPath id="sm-hex">
          <path d="M26 2 L47 14 L47 38 L26 50 L5 38 L5 14Z" />
        </clipPath>
      </defs>
      {/* Hexagon body */}
      <path d="M26 2 L47 14 L47 38 L26 50 L5 38 L5 14Z" fill="url(#sm-brand)" />
      {/* Gloss highlight */}
      <rect x="0" y="0" width="52" height="26" fill="url(#sm-gloss)" clipPath="url(#sm-hex)" />
      {/* Rising bars */}
      <rect x="13" y="28" width="7" height="10" rx="2" fill="rgba(255,255,255,0.60)" />
      <rect x="22" y="21" width="7" height="17" rx="2" fill="rgba(255,255,255,0.80)" />
      <rect x="31" y="14" width="7" height="24" rx="2" fill="white" />
      {/* Baseline */}
      <rect x="12" y="39" width="27" height="2" rx="1" fill="rgba(255,255,255,0.40)" />
      {/* Sparkle */}
      <circle cx="34.5" cy="12" r="2" fill="rgba(255,255,255,0.80)" />
    </svg>
    <span style={{ fontFamily: "var(--font-roboto)", fontSize: size * 0.96, color, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 900 }}>
      skillio<span style={{ opacity: 0.4 }}>.</span>
    </span>
  </div>
);

// ============================================================
// NAVBAR
// ============================================================
export function Navbar({ onCTA }: { onCTA: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Nav minimal: logo + "Iniciar sesión" (link discreto) + 1 único CTA primario.
  // Sin menú de secciones para no competir con la meta de conversión.
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(240,237,255,0.92)" : "transparent",
      backdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(53,56,49,0.06)" : "1px solid transparent",
      transition: "background .2s, border-color .2s",
    }}>
      <div className="container-x" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <a href="#top" style={{ textDecoration: "none" }}>
          <SkillioMark />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/login" style={{ color: "var(--ink-soft)", fontSize: 14.5, fontWeight: 500, textDecoration: "none" }}>
            Iniciar sesión
          </Link>
          <button className="btn btn-primary" onClick={onCTA}>
            Empezá gratis
          </button>
        </div>
      </div>
    </header>
  );
}


// ============================================================
// CTA MICROCOPY — reversión de riesgo, va debajo de CADA CTA primario
// ============================================================
export function CTAMicro({ light = false, center = true }: { light?: boolean; center?: boolean }) {
  const color = light ? "rgba(255,255,255,0.85)" : "var(--ink-softer)";
  return (
    <div style={{ display: "flex", justifyContent: center ? "center" : "flex-start", alignItems: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
      {["Sin tarjeta", "Probá PRO", "Cancelás cuando quieras"].map((t) => (
        <span key={t} style={{ fontSize: 13, color, display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 500 }}>
          <IconCheck size={13} /> {t}
        </span>
      ))}
    </div>
  );
}

// ============================================================
// MEDIA SLOT — espacio para el video en loop del usuario.
// Si existe /public/landing/<src> (.mp4/.webm), se reproduce en loop.
// Si no, se ve un marcador con la ruta (no rompe la landing).
// ============================================================
export function MediaSlot({ src, label, ratio = "16 / 10" }: { src: string; label: string; ratio?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: ratio, borderRadius: 22, overflow: "hidden", background: "var(--paper-warm)", border: "1px solid rgba(53,56,49,0.08)", boxShadow: "0 24px 52px -24px rgba(150,85,229,.25)" }}>
      {!failed ? (
        <video
          src={"/landing/" + src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          aria-label={label}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div className="grid-bg fade" style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center", padding: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(150,85,229,0.10)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <IconSparkles size={26} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{label}</div>
          <code className="mono" style={{ fontSize: 12, color: "var(--ink-softer)", background: "var(--bg-2)", padding: "4px 10px", borderRadius: 8 }}>public/landing/{src}</code>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HERO TYPEWRITER — rota frases en el titulo
// ============================================================
const HERO_PHRASES = ["la mitad", "en 3 dias", "sin releer todo", "con IA"];

function HeroTypewriter() {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState(HERO_PHRASES[0]);
  const [phase, setPhase] = useState<"wait" | "erase" | "type">("wait");

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    if (phase === "wait") {
      id = setTimeout(() => setPhase("erase"), 2800);
    } else if (phase === "erase") {
      if (displayed.length > 0) {
        id = setTimeout(() => setDisplayed(d => d.slice(0, -1)), 55);
      } else {
        const next = (phraseIdx + 1) % HERO_PHRASES.length;
        setPhraseIdx(next);
        setPhase("type");
      }
    } else {
      const target = HERO_PHRASES[phraseIdx];
      if (displayed.length < target.length) {
        id = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 80);
      } else {
        setPhase("wait");
      }
    }
    return () => clearTimeout(id);
  }, [phase, displayed, phraseIdx]);

  return (
    <>
      <span className="gradient-text">{displayed}</span>
      <span className="hero-tw-cursor">|</span>
    </>
  );
}

// ============================================================
// HERO TEXT (seccion 1)
// ============================================================
export function HeroText({ onCTA }: { onCTA: () => void }) {
  return (
    <section
      id="top"
      style={{
        position: "relative",
        height: "100svh",
        maxHeight: "100svh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        overflow: "hidden",
        paddingTop: "clamp(72px, 16svh, 160px)",
      }}
    >
      {/* Video de fondo */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src="/fondo%20hero%201%20mobile.mp4"
        autoPlay
        loop
        muted
        playsInline
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center",
          zIndex: 0,
        }}
      />

      {/* Velo oscuro para legibilidad del título */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          background: "linear-gradient(180deg, rgba(26,15,56,0.35) 0%, rgba(26,15,56,0.20) 50%, rgba(26,15,56,0.50) 100%)",
        }}
      />

      {/* Título */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 24px" }}>
        <h1
          className="h-display"
          style={{ margin: "0 auto", maxWidth: 860, color: "#ffffff", textShadow: "0 2px 24px rgba(26,15,56,0.5)" }}
        >
          Aprobá tu parcial<br />estudiando <HeroTypewriter />.
        </h1>
      </div>
      <style>{`
        @keyframes heroCursorBlink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        .hero-tw-cursor { animation: heroCursorBlink 0.75s step-end infinite; color: rgba(166,126,255,0.85); font-weight: 300; }
        @media (prefers-reduced-motion: reduce) { .hero-tw-cursor { animation: none !important; } }
      `}</style>
    </section>
  );
}
