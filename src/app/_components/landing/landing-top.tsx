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
export const SkillioMark = ({ color = "var(--accent)", size = 26 }: { color?: string; size?: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 3 L26 9 L26 21 L16 27 L6 21 L6 9 Z" stroke={color} strokeWidth="2" fill="none" />
      <circle cx="16" cy="15" r="3.5" fill={color} />
      <path d="M16 18.5 L16 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
    <span style={{ fontFamily: "var(--font-roboto)", fontSize: size * 0.95, color, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 700 }}>
      skillio<span style={{ opacity: 0.5 }}>.</span>
    </span>
  </div>
);

// ============================================================
// NAVBAR
// ============================================================
export function Navbar({ onCTA }: { onCTA: () => void }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: "smooth" });
  };

  return (
    <>
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: scrolled ? "rgba(251,241,239,0.92)" : "transparent",
        backdropFilter: scrolled ? "saturate(140%) blur(10px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(53,56,49,0.06)" : "1px solid transparent",
        transition: "background .2s, border-color .2s",
      }}>
        <div className="container-x" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <a href="#top" onClick={go("top")} style={{ textDecoration: "none" }}>
            <SkillioMark />
          </a>
          <nav style={{ display: "flex", gap: 28 }} className="hide-lp-mobile">
            <a className="nav-link" href="#funciones" onClick={go("funciones")}>Funciones</a>
            <a className="nav-link" href="#como" onClick={go("como")}>Cómo funciona</a>
            <a className="nav-link" href="#comunidad" onClick={go("comunidad")}>Comunidad</a>
            <a className="nav-link" href="#planes" onClick={go("planes")}>Planes</a>
            <a className="nav-link" href="#faq" onClick={go("faq")}>FAQ</a>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/login" className="hide-lp-mobile" style={{ color: "var(--ink)", fontSize: 15, fontWeight: 500, textDecoration: "none" }}>
              Iniciar sesión
            </Link>
            <button className="btn btn-primary hide-lp-mobile" onClick={onCTA}>
              Empezá PRO Gratis · 24h
            </button>
            <button className="show-lp-mobile btn btn-ghost" style={{ padding: 10 }} onClick={() => setOpen(true)} aria-label="Abrir menú">
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 60, overflowY: "auto", transform: open ? "translateY(0)" : "translateY(-100%)", transition: "transform .35s cubic-bezier(.7,0,.2,1)" }}>
        <div style={{ padding: "22px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <SkillioMark />
          <button className="btn btn-ghost" style={{ padding: 10 }} onClick={() => setOpen(false)}><IconClose /></button>
        </div>
        <div style={{ padding: "8px 24px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
          {[["Funciones", "funciones"], ["Cómo funciona", "como"], ["Comunidad", "comunidad"], ["Planes", "planes"], ["FAQ", "faq"]].map(([label, id]) => (
            <a key={id} href={"#" + id} onClick={go(id)} style={{ fontFamily: "var(--font-roboto)", fontWeight: 700, fontSize: 36, color: "var(--ink)", textDecoration: "none", padding: "12px 0", borderBottom: "1px solid rgba(53,56,49,.08)", letterSpacing: "-0.025em", display: "block" }}>
              {label}
            </a>
          ))}
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="btn btn-primary btn-lg" onClick={() => { setOpen(false); onCTA(); }}>Empezá PRO Gratis · 24h</button>
            <Link href="/login" className="btn btn-ghost btn-lg" style={{ textAlign: "center" }}>Iniciar sesión</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) { .hide-lp-mobile { display: none !important; } }
        @media (min-width: 881px) { .show-lp-mobile { display: none !important; } }
      `}</style>
    </>
  );
}


// ============================================================
// HERO TEXT (seccion 1)
// ============================================================
export function HeroText({ onCTA }: { onCTA: () => void }) {
  return (
    <section id="top" className="section" style={{ position: "relative", paddingTop: "clamp(40px, 6vw, 80px)", paddingBottom: "clamp(40px, 5vw, 60px)" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }} className="grid-bg fade" />
      <div className="container-x" style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
          <span className="badge">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)", display: "inline-block" }} className="dot-pulse" />
            Nuevo · IA con Claude Opus 4.7
          </span>
        </div>

        <h1 className="h-display" style={{ textAlign: "center", margin: "0 auto", maxWidth: 980 }}>
          Tus materias <span className="gradient-text">resumidas</span> y<br />
          explicadas en segundos
        </h1>

        <p style={{ textAlign: "center", margin: "24px auto 0", fontSize: "clamp(16px, 1.6vw, 19px)", lineHeight: 1.55, color: "#4A2418", maxWidth: 580 }}>
          Ahorrá el 80% de tu tiempo de lectura: subí tus apuntes,
          generá resúmenes, flashcards y simulacros. Aprobá más fácil, estudiá más rápido.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-lg" onClick={onCTA}>
            Empezá PRO Gratis · 24h <IconArrow size={16} />
          </button>
          <a href="#como" className="btn btn-ghost btn-lg">Ver cómo funciona</a>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 16, gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, color: "var(--ink-softer)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconCheck size={14} /> 24h gratis de PRO
          </span>
          <span style={{ fontSize: 13, color: "var(--ink-softer)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconHeart size={14} /> +1.200 estudiantes activos
          </span>
        </div>
      </div>
    </section>
  );
}


// ============================================================
// LOGO STRIP (seccion 3 — universidades)
// ============================================================
function FakeLogo({ label, sub, highlight }: { label: string; sub: string; highlight?: boolean }) {
  return (
    <div className="logo-strip" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "12px 8px", opacity: highlight ? 0.85 : undefined, filter: highlight ? "grayscale(0)" : undefined }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: highlight ? "var(--accent)" : "var(--ink)", display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: 13 }}>{label[0]}</div>
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--ink-softer)" }}>{sub}</div>}
      </div>
    </div>
  );
}

export function LogoStrip() {
  return (
    <section style={{ padding: "32px 0 20px", borderTop: "1px solid rgba(53,56,49,0.08)", borderBottom: "1px solid rgba(53,56,49,0.08)", background: "var(--paper-warm)" }}>
      <div className="container-x">
        <p style={{ textAlign: "center", margin: 0, marginBottom: 20, fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-softer)", fontWeight: 600 }}>
          Pagás seguro · Estudiantes de toda Argentina
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", alignItems: "center", gap: 24, color: "var(--ink-soft)" }}>
          <FakeLogo label="MercadoPago" sub="Partner oficial" highlight />
          <FakeLogo label="UNC" sub="Universidad Nacional" />
          <FakeLogo label="UTN" sub="Tec. Nacional" />
          <FakeLogo label="Siglo 21" sub="" />
          <FakeLogo label="UCC" sub="" />
          <FakeLogo label="UBA" sub="" />
        </div>
      </div>
    </section>
  );
}
