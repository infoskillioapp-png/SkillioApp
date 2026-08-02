"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
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
export const IconCube = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2 21 7v10l-9 5-9-5V7z" /><path d="M3 7l9 5 9-5M12 12v10" />
  </svg>
);
export const IconTarget = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
export const IconGamepad = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 8h10a5 5 0 0 1 5 5v2a3 3 0 0 1-5.2 2L15 15H9l-1.8 2A3 3 0 0 1 2 15v-2a5 5 0 0 1 5-5Z" />
    <line x1="7.5" y1="11.5" x2="7.5" y2="14.5" /><line x1="6" y1="13" x2="9" y2="13" />
    <circle cx="15.5" cy="11.5" r="0.6" fill="currentColor" /><circle cx="17.5" cy="13.5" r="0.6" fill="currentColor" />
  </svg>
);
export const IconHeadphones = ({ size = 24 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13a9 9 0 0 1 18 0" />
    <rect x="2.5" y="13" width="5" height="7" rx="2" /><rect x="16.5" y="13" width="5" height="7" rx="2" />
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
    <span style={{ fontFamily: "var(--font-roboto)", fontSize: size * 0.96, color, lineHeight: 1, letterSpacing: "-0.03em", fontWeight: 900, transition: "color .2s" }}>
      skillio<span style={{ opacity: 0.4 }}>.</span>
    </span>
  </div>
);

// ============================================================
// NAVBAR
// ============================================================
export function Navbar({ onCTA }: { onCTA: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  // El hero (id="top") tiene fondo OSCURO; el resto de la página es claro.
  // En vez de un umbral fijo de scroll (que disparaba el cambio a los 8px,
  // todavia sobre el hero oscuro -> corte brusco), se usa un
  // IntersectionObserver sobre el propio hero: el navbar solo pasa a modo
  // "claro" cuando el hero deja de estar debajo de él (rootMargin resta la
  // altura del propio navbar sticky), sincronizado con lo que hay atrás.
  useEffect(() => {
    const hero = document.getElementById("top");
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" }
    );
    obs.observe(hero);
    return () => obs.disconnect();
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
          <SkillioMark color={scrolled ? "var(--ink)" : "#fff"} />
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Link href="/login" style={{ color: scrolled ? "var(--ink-soft)" : "rgba(255,255,255,.85)", fontSize: 14.5, fontWeight: 500, textDecoration: "none", transition: "color .2s" }}>
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

// El título tiene el mismo texto/mecanismo de siempre, pero las frases del
// typewriter tienen largos MUY distintos ("con IA" vs "sin releer todo") y
// eso hace que el h1 envuelva en más o menos líneas según la frase — sin
// esto, toda la columna (y con align-items:center, la fila entera) se
// corría verticalmente cada vez que cambiaba de frase. Se mide en un probe
// invisible la altura de CADA frase posible y se reserva la más alta, así
// el contenedor nunca cambia de tamaño.
function HeroTitle() {
  const probeRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const [minH, setMinH] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    function measure() {
      let max = 0;
      probeRefs.current.forEach((el) => { if (el) max = Math.max(max, el.offsetHeight); });
      if (max > 0) setMinH(max);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // overflowWrap:"anywhere" en TODO el título (visible y probes) — si algún
  // largo de frase + cursor no encuentra un espacio donde cortar antes del
  // borde de la columna, esto lo obliga a partir ahí en vez de desbordar
  // horizontalmente fuera de la pantalla.
  const titleStyle: React.CSSProperties = { margin: 0, overflowWrap: "anywhere" };

  return (
    <div style={{ position: "relative", minHeight: minH }}>
      <h1 className="h-display" style={{ ...titleStyle, color: "#fff", position: "relative", zIndex: 1 }}>
        Aprobá tu parcial<br />estudiando <HeroTypewriter />.
      </h1>
      <div aria-hidden style={{ position: "absolute", inset: 0, visibility: "hidden", pointerEvents: "none", zIndex: -1 }}>
        {HERO_PHRASES.map((p, i) => (
          <h1
            key={p}
            ref={(el) => { probeRefs.current[i] = el; }}
            className="h-display"
            style={{ ...titleStyle, position: "absolute", top: 0, left: 0, width: "100%" }}
          >
            {/* Mismo marcado que el título real (span del gradiente + cursor)
               para que la medición sea exacta: el cursor "|" pegado sin
               espacio a la frase puede empujar un salto de línea extra que
               una medición sin cursor no detectaría. */}
            Aprobá tu parcial<br />estudiando <span className="gradient-text">{p}</span><span className="hero-tw-cursor">|</span>.
          </h1>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// HERO (seccion 1) — sin video de fondo (pesaba la carga inicial). El
// título es EL MISMO de siempre (mismo texto, mismo mecanismo de
// typewriter, misma clase .h-display), solo se recolorea a tinta oscura
// porque el fondo ya no es un video oscuro sino el mesh claro del sitio.
// La pila de tarjetas (reemplaza al Ticker+Demo) es 100% CSS — sin video,
// sin imágenes, animación por keyframes nada más.
// ============================================================
const HERO2_TINTS: Record<string, { soft: string; ink: string; grad: string; glow: string }> = {
  violet: { soft: "#ece5fe", ink: "#7c3aed", grad: "linear-gradient(135deg,#865CB8,#9655E5)", glow: "rgba(150,85,229,.3)" },
  blue: { soft: "#dfe7ff", ink: "#3d63e0", grad: "linear-gradient(135deg,#6f97ff,#3d63e0)", glow: "rgba(61,99,224,.3)" },
  coral: { soft: "#ffe1e6", ink: "#e4264f", grad: "linear-gradient(135deg,#ff6b81,#e4264f)", glow: "rgba(228,38,79,.28)" },
  amber: { soft: "#fff3d6", ink: "#e2921a", grad: "linear-gradient(135deg,#ffd873,#ffb020)", glow: "rgba(255,176,32,.25)" },
  teal: { soft: "#d9f7f2", ink: "#0e9e91", grad: "linear-gradient(135deg,#5eead4,#0e9e91)", glow: "rgba(14,158,145,.28)" },
};

// Vista previa dentro de cada tarjeta (lo que le daba densidad/diseño al
// mockup original — sin esto las tarjetas quedan "vacías").
function ResumenPreview() {
  return (
    <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 9 }}>
      <i style={{ height: 9, borderRadius: 5, background: "#e7e8f3", width: "100%", display: "block" }} />
      <i style={{ height: 9, borderRadius: 5, background: "#e7e8f3", width: "88%", display: "block" }} />
      <i style={{ height: 9, borderRadius: 5, background: "#d9cdfd", width: "62%", display: "block" }} />
    </div>
  );
}
function TarjetasPreview() {
  return (
    <div style={{ marginTop: 18, border: "1.5px dashed #c1d0ff", borderRadius: 18, padding: 16, fontSize: 14, color: "#5c6089", lineHeight: 1.5 }}>
      ¿Qué es la mitosis?<br /><b style={{ color: "#3d63e0" }}>Tocá para revelar</b>
    </div>
  );
}
function SimulacroPreview() {
  return (
    <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
      <div style={{ flex: 1, background: "#f4f5fb", borderRadius: 16, padding: 12 }}>
        <div style={{ fontSize: 11, color: "#8487a6" }}>Preguntas</div>
        <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: 25, color: "var(--ink)" }}>50</div>
      </div>
      <div style={{ flex: 1, background: "#f4f5fb", borderRadius: 16, padding: 12 }}>
        <div style={{ fontSize: 11, color: "#8487a6" }}>Precisión</div>
        <div style={{ fontFamily: "var(--font-jakarta)", fontWeight: 700, fontSize: 25, color: "#e4264f" }}>90%</div>
      </div>
    </div>
  );
}
function JuegoPreview() {
  return (
    <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 10 }}>
      <span className="sk2-heartpop" style={{ fontSize: 21 }}>❤️❤️🤍</span>
      <span style={{ background: "#fff3d6", color: "#e2921a", padding: "5px 13px", borderRadius: 999, fontWeight: 700, fontSize: 15 }}>🔥 racha 7</span>
    </div>
  );
}
function AudioPreview() {
  const heights = [0.5, 0.8, 1, 0.9, 0.6, 0.75, 0.4];
  return (
    <div style={{ marginTop: 22, display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
      {heights.map((h, i) => (
        <i key={i} className="sk2-wavebar" style={{ flex: 1, background: i % 2 ? "#2dd4bf" : "#5eead4", height: `${h * 100}%`, animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

const HERO2_CARDS = [
  { icon: IconDoc, tint: "violet", eyebrow: "PARA ENTENDER", title: <>Resúmenes<br />de IA</>, cta: "Ver resumen", pill: "Resúmenes", Preview: ResumenPreview },
  { icon: IconCube, tint: "blue", eyebrow: "PARA MEMORIA", title: <>Tarjetas<br />infinitas</>, cta: "Repasar", pill: "Tarjetas", Preview: TarjetasPreview },
  { icon: IconTarget, tint: "coral", eyebrow: "PARA EL EXAMEN", title: <>Simulacro<br />de IA</>, cta: "Comenzar", pill: "Simulacro", Preview: SimulacroPreview },
  { icon: IconGamepad, tint: "amber", eyebrow: "PARA ENGANCHARTE", title: <>Modo<br />juego</>, cta: "Jugar", pill: "Modo juego", Preview: JuegoPreview },
  { icon: IconHeadphones, tint: "teal", eyebrow: "PARA EL VIAJE", title: <>Podcast<br />del resumen</>, cta: "Escuchar", pill: "Podcast", Preview: AudioPreview },
] as const;

function HeroCardStack() {
  return (
    <div className="sk2-stackwrap" aria-hidden>
      <div className="sk2-stack">
        {HERO2_CARDS.map((c, i) => {
          const t = HERO2_TINTS[c.tint];
          const Icon = c.icon;
          const Preview = c.Preview;
          return (
            <div key={i} className="sk2-card" style={{ animationDelay: `${-i * 2.8}s` }}>
              {i === 0 && <div className="sk2-sheen" />}
              <div className="sk2-cardicon" style={{ background: t.soft, color: t.ink }}><Icon size={26} /></div>
              <div className="sk2-eyebrow" style={{ color: t.ink }}>{c.eyebrow}</div>
              <div className="sk2-cardtitle">{c.title}</div>
              <Preview />
              <div className="sk2-cardcta" style={{ background: t.grad, boxShadow: `0 10px 22px ${t.glow}` }}>{c.cta}</div>
            </div>
          );
        })}
      </div>
      <div className="sk2-rail">
        {HERO2_CARDS.map((c, i) => (
          <span key={i} className="sk2-pill" style={{ animationDelay: `${-i * 2.8}s` }}>
            {c.pill}
            <i style={{ background: HERO2_TINTS[c.tint].ink, animationDelay: `${-i * 2.8}s` }} />
          </span>
        ))}
      </div>
    </div>
  );
}

// Fondos animados importados de Claude Design (proyecto "Hero Fondos v2",
// variantes 4b desktop / 4c mobile). Solo la capa decorativa — el
// contenido (título, subtítulo, tarjetas, CTAs) no cambia; sí se recolorea
// el texto suelto (título/subtítulo/riel) a blanco porque el fondo pasó de
// claro a oscuro y el ink oscuro quedaría ilegible.
function HeroBackground() {
  return (
    <>
      {/* 4b — Cámara iridiscente (desktop): halo cónico girando detrás del
         mazo + 2 esferas 3D con specular + orbe lejano difuminado. */}
      <div className="sk2-bg sk2-bg-d" aria-hidden>
        <div className="sk2-halo" />
        <div className="sk2-halo-mask" />
        <div className="sk2-halo-ring" />
        <div className="sk2-sphere sk2-sphere-v" />
        <div className="sk2-sphere sk2-sphere-t" />
        <div className="sk2-orb-far" />
        <div className="sk2-vignette" />
      </div>

      {/* 4c — Cristal bajo el agua (mobile): cáusticas SVG + arcos de
         vidrio en profundidad + neblina violeta. */}
      <div className="sk2-bg sk2-bg-m" aria-hidden>
        <svg className="sk2-caustic-svg" viewBox="0 0 1500 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="sk2cg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#c0abfc" />
              <stop offset="50%" stopColor="#5eead4" />
              <stop offset="100%" stopColor="#4f7dff" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#sk2cg)" strokeWidth="4">
            <path d="M-40 200C220 120 340 320 620 250 880 184 1000 360 1300 280" />
            <path d="M-40 400C240 320 360 520 640 450 900 384 1020 560 1320 480" />
            <path d="M-40 620C220 540 380 740 660 670 920 604 1040 780 1340 700" />
          </g>
        </svg>
        <div className="sk2-orb-m1" />
        <div className="sk2-glassring" />
        <div className="sk2-vignette" />
      </div>
    </>
  );
}

export function HeroText({ onCTA }: { onCTA: () => void }) {
  return (
    <section id="top" className="sk2-hero">
      <HeroBackground />

      <div className="container-x sk2-grid">
        <div className="sk2-copy">
          <HeroTitle />

          <p className="sk2-sub">
            Un apunte adentro, cinco formas de estudiarlo afuera. Sin copiar, sin resumir a mano, sin quedarte hasta las 4&nbsp;AM.
          </p>

          <div className="sk2-ctas">
            <button className="btn btn-primary btn-lg btn-pulse" onClick={onCTA}>
              Empezá gratis <IconArrow size={18} />
            </button>
            <a href="#como" className="btn btn-ghost btn-lg">Ver cómo funciona</a>
          </div>

          <div className="sk2-trust">
            <div className="sk2-avatars">
              <span style={{ background: "#865CB8" }} />
              <span style={{ background: "#A67EFF" }} />
              <span style={{ background: "#9655E5" }} />
            </div>
            <span>+1.200 estudiantes ya rinden con Skillio</span>
          </div>
        </div>

        <div className="sk2-visual">
          <HeroCardStack />
        </div>
      </div>

      <style>{`
        @keyframes heroCursorBlink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        .hero-tw-cursor { animation: heroCursorBlink 0.75s step-end infinite; color: rgba(166,126,255,0.85); font-weight: 300; }
        @media (prefers-reduced-motion: reduce) { .hero-tw-cursor { animation: none !important; } }

        .sk2-hero {
          position: relative; padding: 40px 0 48px; overflow: hidden;
          background: radial-gradient(100% 90% at 50% 110%, #2b1560 0%, #170f38 50%, #0b0820 100%);
        }
        .sk2-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .sk2-bg-m { display: none; }
        .sk2-vignette { position: absolute; inset: 0; background: radial-gradient(90% 70% at 30% 30%, rgba(11,8,32,0), rgba(11,8,32,.55)); }

        /* 4b — desktop */
        .sk2-halo {
          position: absolute; right: 100px; top: 40px; width: 660px; height: 660px; border-radius: 50%;
          background: conic-gradient(from 0deg,#8b5cf6,#4f7dff,#5eead4,#f9435f,#ffc93c,#8b5cf6);
          filter: blur(72px); opacity: .5; animation: sk2-conic 46s linear infinite;
        }
        .sk2-halo-mask { position: absolute; right: 210px; top: 150px; width: 440px; height: 440px; border-radius: 50%; background: radial-gradient(circle at 50% 50%, rgba(11,8,32,.95) 52%, rgba(11,8,32,0) 72%); }
        .sk2-halo-ring { position: absolute; right: 210px; top: 150px; width: 440px; height: 440px; border-radius: 50%; border: 1px solid rgba(255,255,255,.2); box-shadow: inset 0 0 60px rgba(255,255,255,.1), 0 0 90px rgba(139,92,246,.28); }
        .sk2-sphere-v {
          position: absolute; left: 80px; bottom: 70px; width: 132px; height: 132px; border-radius: 50%;
          background: radial-gradient(circle at 32% 28%,#ffffff 0%,#c0abfc 22%,#7c3aed 62%,#3a1c78 100%);
          box-shadow: 0 30px 60px rgba(0,0,0,.5), inset -14px -18px 34px rgba(0,0,0,.35);
          animation: sk2-orb 22s ease-in-out infinite;
        }
        .sk2-sphere-t {
          position: absolute; left: 250px; bottom: 180px; width: 62px; height: 62px; border-radius: 50%;
          background: radial-gradient(circle at 32% 28%,#ffffff 0%,#a7f3ea 24%,#0e9e91 66%,#06403c 100%);
          box-shadow: 0 18px 34px rgba(0,0,0,.5), inset -8px -10px 20px rgba(0,0,0,.35);
          animation: sk2-orb2 18s ease-in-out infinite;
        }
        .sk2-orb-far {
          position: absolute; left: -60px; top: 120px; width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(79,125,255,.5), rgba(79,125,255,0) 70%);
          filter: blur(44px); animation: sk2-orb2 26s ease-in-out infinite;
        }

        /* 4c — mobile */
        .sk2-caustic-svg { position: absolute; inset: -15% -30%; width: 160%; height: 130%; opacity: .3; animation: sk2-caustic 26s ease-in-out infinite alternate; }
        .sk2-orb-m1 {
          position: absolute; left: -30%; top: -22%; width: 108%; height: 55%; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,.5), rgba(139,92,246,0) 68%);
          filter: blur(42px); animation: sk2-orb 24s ease-in-out infinite;
        }
        .sk2-glassring {
          position: absolute; right: -30%; top: 20%; width: 85%; height: 40%; border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,.14);
          background: linear-gradient(140deg, rgba(255,255,255,.12), rgba(255,255,255,.02));
          backdrop-filter: blur(18px); box-shadow: inset 0 2px 0 rgba(255,255,255,.3);
        }

        @keyframes sk2-orb { 0%,100% { transform: translate3d(0,0,0) scale(1); } 33% { transform: translate3d(40px,-30px,0) scale(1.08); } 66% { transform: translate3d(-26px,26px,0) scale(.94); } }
        @keyframes sk2-orb2 { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(-46px,32px,0) scale(1.12); } }
        @keyframes sk2-conic { to { transform: rotate(360deg); } }
        @keyframes sk2-caustic { 0% { transform: translate(0,0) rotate(0deg); } 100% { transform: translate(-60px,40px) rotate(-8deg); } }

        .sk2-grid { position: relative; z-index: 1; display: grid; grid-template-columns: 1.05fr .95fr; gap: 36px; align-items: start; padding-top: 12px; }
        .sk2-copy { display: flex; flex-direction: column; gap: 20px; }
        .sk2-sub { margin: 0; font-size: 17.5px; line-height: 1.6; color: rgba(255,255,255,.72); max-width: 460px; }
        .sk2-ctas { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .sk2-trust { display: flex; align-items: center; gap: 12px; }
        .sk2-avatars { display: flex; }
        .sk2-avatars span { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #fff; margin-left: -9px; }
        .sk2-avatars span:first-child { margin-left: 0; }
        .sk2-trust span:last-child { font-size: 13px; color: rgba(255,255,255,.6); }

        .sk2-visual { position: relative; }
        .sk2-stackwrap { display: flex; flex-direction: column; align-items: center; gap: 24px; }
        .sk2-stack { position: relative; width: 460px; height: 480px; perspective: 1700px; perspective-origin: 60% 40%; --tiltY: -14deg; --tiltX: 5deg; }
        .sk2-card {
          position: absolute; inset: 0; width: 100%; border-radius: 28px; background: #fff;
          box-shadow: 0 30px 70px rgba(63,25,117,.24); padding: 32px; box-sizing: border-box; overflow: hidden;
          transform: rotateY(var(--tiltY)) rotateX(var(--tiltX));
          animation: sk2-stack 14s cubic-bezier(.65,.02,.25,1) infinite;
        }
        .sk2-sheen { position: absolute; top: 0; left: 0; width: 70px; height: 200%; background: linear-gradient(90deg,transparent,rgba(255,255,255,.75),transparent); animation: sk2-sheen 14s ease-in-out infinite; }
        .sk2-cardicon { width: 56px; height: 56px; border-radius: 17px; display: flex; align-items: center; justify-content: center; }
        .sk2-eyebrow { font-size: 12.5px; font-weight: 700; letter-spacing: .09em; margin-top: 22px; }
        .sk2-cardtitle { font-family: var(--font-jakarta); font-weight: 700; font-size: 34px; color: var(--ink); margin-top: 8px; line-height: 1.14; }
        .sk2-cardcta { position: absolute; left: 32px; right: 32px; bottom: 32px; height: 52px; border-radius: 999px; color: #fff; font-family: var(--font-jakarta); font-weight: 600; font-size: 16px; display: flex; align-items: center; justify-content: center; }
        @keyframes sk2-wave { 0%,100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
        .sk2-wavebar { border-radius: 3px; transform-origin: bottom; animation: sk2-wave 1.1s ease-in-out infinite; }
        @keyframes sk2-pop { 0%,100% { transform: scale(1); } 45% { transform: scale(1.12); } }
        .sk2-heartpop { display: inline-block; animation: sk2-pop 1.8s ease-in-out infinite; }

        .sk2-rail { display: flex; gap: 7px; padding: 6px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.16); border-radius: 999px; backdrop-filter: blur(10px); max-width: 100%; overflow-x: auto; }
        .sk2-pill { position: relative; overflow: hidden; flex: none; font-size: 12px; font-weight: 600; padding: 8px 13px; border-radius: 999px; color: rgba(255,255,255,.5); animation: sk2-rail 14s linear infinite; }
        .sk2-pill i { position: absolute; left: 0; bottom: 0; height: 2.5px; width: 0; border-radius: 2px; animation: sk2-railbar 14s linear infinite; animation-delay: inherit; }

        @keyframes sk2-stack {
          0%,16% { transform: translateY(0) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(1); opacity: 1; z-index: 5; }
          19.5% { transform: translateY(-64px) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(.97); opacity: 0; z-index: 5; }
          19.6%,20% { transform: translateY(88px) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(.8); opacity: 0; z-index: 1; }
          24%,36% { transform: translateY(88px) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(.8); opacity: .3; z-index: 1; }
          40%,56% { transform: translateY(66px) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(.85); opacity: .5; z-index: 2; }
          60%,76% { transform: translateY(44px) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(.9); opacity: .7; z-index: 3; }
          80%,96% { transform: translateY(22px) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(.95); opacity: .88; z-index: 4; }
          100% { transform: translateY(0) rotateY(var(--tiltY)) rotateX(var(--tiltX)) scale(1); opacity: 1; z-index: 5; }
        }
        @keyframes sk2-sheen { 0%,70% { transform: translateX(-140%) skewX(-18deg); } 100% { transform: translateX(240%) skewX(-18deg); } }
        @keyframes sk2-rail {
          0%,16% { background: rgba(255,255,255,.2); color: #fff; }
          20%,96% { background: rgba(255,255,255,.05); color: rgba(255,255,255,.5); }
          100% { background: rgba(255,255,255,.2); color: #fff; }
        }
        @keyframes sk2-railbar { 0% { width: 0; } 16% { width: 100%; } 20%,100% { width: 0; } }

        @media (prefers-reduced-motion: reduce) {
          .sk2-card, .sk2-sheen, .sk2-pill, .sk2-pill i { animation: none !important; }
          .sk2-card:not(:first-child) { display: none; }
        }

        @media (max-width: 900px) {
          /* padding-bottom extra: el StickyMobileCTA global es fixed y tapaba
             el riel de pastillas si el hero terminaba justo contra el borde */
          .sk2-hero { padding: 14px 0 118px; }
          .sk2-grid { grid-template-columns: 1fr; gap: 14px; }
          .sk2-copy { gap: 10px; }
          .sk2-sub { display: none; }
          .sk2-ctas { display: none; }
          .sk2-trust { display: none; }
          .sk2-stackwrap { gap: 14px; max-width: 100vw; }
          /* Mismo tilt 3D que desktop (no se toca --tiltY/--tiltX): la
             tarjeta mantiene el mismo giro y la misma calidad. El overflow
             real era el riel de pastillas de abajo, que no tenía un limite
             de ancho firme en mobile y se salía del viewport en vez de
             quedarse contenido con scroll lateral (como esta pensado). */
          .sk2-stack { width: min(300px, 78vw); max-width: calc(100vw - 40px); height: 330px; margin: 0 auto; }
          .sk2-card { padding: 22px; }
          .sk2-cardicon { width: 42px; height: 42px; border-radius: 13px; }
          .sk2-eyebrow { margin-top: 14px; font-size: 10px; }
          .sk2-cardtitle { font-size: 22px; margin-top: 4px; }
          .sk2-cardcta { left: 22px; right: 22px; bottom: 22px; height: 44px; font-size: 14px; }
          .sk2-rail { max-width: calc(100vw - 40px); }
          .sk2-hero { background: linear-gradient(165deg, #1d1348 0%, #2e1a63 40%, #120d2e 100%); }
          .sk2-bg-d { display: none; }
          .sk2-bg-m { display: block; }
        }
      `}</style>
    </section>
  );
}
