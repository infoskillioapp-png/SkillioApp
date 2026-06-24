"use client";

import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { IconDoc, IconExam, IconFlash, IconUpload, IconBolt, IconTrophy, IconSparkles, IconX, MediaSlot } from "./landing-top";

// ============================================================
// SHARED: SECTION HEADER
// ============================================================
export function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: ReactNode; sub?: string | null }) {
  return (
    <div className="reveal" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
      <div className="eyebrow" style={{ marginBottom: 12, color: "var(--accent)" }}>{eyebrow}</div>
      <h2 className="h-section" style={{ margin: 0 }}>{title}</h2>
      {sub && <p style={{ marginTop: 14, fontSize: 17, lineHeight: 1.55, color: "var(--ink-soft)" }}>{sub}</p>}
    </div>
  );
}

// ============================================================
// PROBLEMA / AGITACIÓN — conexión emocional
// ============================================================
export function Problema() {
  const dolores = [
    "Parcial en 2 días y 200 páginas sin abrir.",
    "Apuntes tan desordenados que ni vos los entendés.",
    "Releés lo mismo 5 veces y no te queda nada.",
    "No sabés ni por dónde empezar.",
  ];
  return (
    <section className="section" style={{ background: "var(--bg-2)" }}>
      <div className="container-x" style={{ maxWidth: 820 }}>
        <h2 className="h-section reveal" style={{ textAlign: "center", margin: "0 auto", maxWidth: 640 }}>
          Si estás así, Skillio es <span className="gradient-text">para vos</span>:
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 38 }}>
          {dolores.map((d, i) => (
            <div key={i} className="card reveal" style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ flex: "0 0 30px", height: 30, borderRadius: 999, background: "rgba(150,85,229,0.10)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <IconX size={14} stroke={2.5} />
              </span>
              <span style={{ fontSize: 15.5, lineHeight: 1.4, color: "var(--ink)", fontWeight: 500 }}>{d}</span>
            </div>
          ))}
        </div>
        <p className="reveal" style={{ textAlign: "center", margin: "32px auto 0", maxWidth: 600, fontSize: "clamp(18px, 2vw, 22px)", lineHeight: 1.5, color: "var(--ink)", fontWeight: 600 }}>
          Respirá. Skillio convierte ese caos en un plan de estudio <span className="gradient-text">en segundos</span>.
        </p>
      </div>
    </section>
  );
}

// ============================================================
// BENEFICIOS — las 3 features core, contadas como RESULTADO
// ============================================================
export function Features() {
  const items = [
    { Icon: IconDoc, title: "Resúmenes que de verdad se entienden", body: "No un copy-paste: la IA te lo explica en tu idioma, con los puntos que entran al parcial. De PDF, foto del pizarrón o tu apunte garabateado." },
    { Icon: IconFlash, title: "Flashcards con repaso espaciado", body: "Para que lo estudiado no se te borre. Te avisamos qué repasar y cuándo, así llegás al parcial con todo fresco." },
    { Icon: IconExam, title: "Simulacros del parcial", body: "Practicá con el formato real: opción múltiple, V/F y desarrollo, con corrección y explicación. Llegás sin sorpresas." },
  ];
  return (
    <section id="funciones" className="section">
      <div className="container-x">
        <SectionHeader
          eyebrow="Lo que vas a lograr"
          title={<>Menos horas de lectura.<br /><span className="gradient-text">Mejores</span> notas.</>}
          sub="Todo en un solo lugar. Sin abrir 17 pestañas, sin pegar texto en otra IA, sin perderte."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, marginTop: 42 }}>
          {items.map((it, i) => (
            <div key={i} className="card lift reveal" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: 13, display: "grid", placeItems: "center", background: "rgba(150,85,229,0.10)", color: "var(--accent)" }}>
                <it.Icon size={26} />
              </div>
              <div>
                <h3 className="h-card" style={{ margin: 0, marginBottom: 10, fontSize: 19, lineHeight: 1.25 }}>{it.title}</h3>
                <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, color: "var(--ink-soft)" }}>{it.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// HOW IT WORKS
// ============================================================
function AnimCounter({ to, active, delay }: { to: number; active: boolean; delay: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const t = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => { i++; setVal(i); if (i >= to) clearInterval(id); }, 80);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(t);
  }, [active, to, delay]);
  return <>{String(val).padStart(2, "0")}</>;
}

export function HowItWorks() {
  const [active, setActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.25 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const steps = [
    { n: 1, title: "Subí tu material", body: "PDF, foto del pizarrón, una hoja escaneada o texto. Si lo podés leer vos, lo lee Skillio.", Icon: IconUpload },
    { n: 2, title: "La IA lo convierte", body: "En resumen, flashcards y simulacro de parcial. En segundos, no en horas.", Icon: IconBolt },
    { n: 3, title: "Estudiás y llegás listo", body: "Repasás con repetición espaciada, hacés el simulacro y entrás al parcial con todo.", Icon: IconTrophy },
  ];

  return (
    <section id="como" ref={sectionRef} className="section" style={{ background: "var(--bg-2)", position: "relative", overflow: "hidden" }}>
      {/* Orbs fondo A */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div className="how-orb how-orb-1" />
        <div className="how-orb how-orb-2" />
        <div className="how-orb how-orb-3" />
      </div>

      <div className="container-x" style={{ position: "relative", zIndex: 1 }}>
        <SectionHeader
          eyebrow="Cómo funciona"
          title={<>De 200 páginas a parcial aprobado<br />en <span className="gradient-text">tres pasos</span></>}
          sub="Sin curva de aprendizaje, seguí el tour guiado dentro de la app y estás listo para empezar a aprobar."
        />

        {/* Línea conectora (solo desktop) */}
        <div className="how-connector-wrap" aria-hidden>
          <div className={`how-connector-line${active ? " how-connector-active" : ""}`} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 50 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              className="reveal how-card"
              style={{
                borderRadius: 22, padding: 28, position: "relative",
                background: "rgba(255,255,255,0.42)",
                backdropFilter: "blur(18px) saturate(160%)",
                WebkitBackdropFilter: "blur(18px) saturate(160%)",
                border: "1px solid rgba(255,255,255,0.72)",
                boxShadow: "0 4px 28px rgba(134,92,184,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
                transition: "transform 250ms ease, box-shadow 250ms ease",
              }}
            >
              {/* Número contador */}
              <div className={`step-num${active ? " step-num-active" : ""}`} style={{
                position: "absolute", top: 22, right: 22,
                fontFamily: "var(--font-serif)", fontSize: 48,
                color: "rgba(134,92,184,0.18)", lineHeight: 0.8,
                transitionDelay: `${i * 150}ms`,
              }}>
                <AnimCounter to={s.n} active={active} delay={i * 180} />
              </div>

              {/* Ícono con bounce */}
              <div className={`step-icon${active ? " step-icon-active" : ""}`} style={{
                width: 48, height: 48, borderRadius: 14,
                background: "var(--accent)", color: "white",
                display: "grid", placeItems: "center", marginBottom: 22,
                animationDelay: `${0.15 + i * 0.15}s`,
              }}>
                <s.Icon size={24} />
              </div>

              <h3 className="h-card" style={{ margin: "0 0 10px", fontSize: 22 }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "var(--ink-soft)" }}>{s.body}</p>

            </div>
          ))}
        </div>

        <div style={{ maxWidth: 900, margin: "44px auto 0" }} className="reveal">
          <MediaSlot src="precarga.mp4" label="Tour guiado · onboarding en segundos" ratio="16 / 9" />
        </div>
      </div>

      <style>{`
        @keyframes howOrbFloat {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(28px,-18px) scale(1.06); }
          66%      { transform: translate(-18px,14px) scale(0.96); }
        }
        .how-orb { position: absolute; border-radius: 50%; filter: blur(64px); opacity: 0.38; }
        .how-orb-1 { width: 340px; height: 340px; background: #865CB8; top: -90px; left: -70px; animation: howOrbFloat 13s ease-in-out infinite; }
        .how-orb-2 { width: 280px; height: 280px; background: #A67EFF; bottom: 10px; right: -50px; animation: howOrbFloat 17s ease-in-out infinite; animation-delay: -6s; }
        .how-orb-3 { width: 200px; height: 200px; background: #9655E5; top: 45%; left: 48%; animation: howOrbFloat 11s ease-in-out infinite; animation-delay: -3s; }

        /* Hover elevación (solo desktop) */
        @media (hover: hover) {
          .how-card:hover { transform: translateY(-5px) !important; box-shadow: 0 14px 44px rgba(134,92,184,0.20), inset 0 1px 0 rgba(255,255,255,0.85) !important; }
        }

        /* Número fade-in con scale */
        .step-num { opacity: 0; transform: scale(0.6); transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        .step-num-active { opacity: 1; transform: scale(1); }

        /* Ícono bounce al entrar */
        @keyframes iconBounce {
          0%   { transform: scale(0.4) rotate(-12deg); opacity: 0; }
          60%  { transform: scale(1.18) rotate(6deg);  opacity: 1; }
          100% { transform: scale(1)   rotate(0deg);   opacity: 1; }
        }
        .step-icon { opacity: 0; }
        .step-icon-active { animation: iconBounce 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }

        /* Línea conectora desktop */
        .how-connector-wrap { display: none; position: relative; height: 2px; margin-top: 74px; margin-bottom: -24px; }
        .how-connector-line { position: absolute; inset: 0; left: 16%; right: 16%; height: 2px; background: linear-gradient(90deg, transparent, #865CB8 25%, #9655E5 50%, #A67EFF 75%, transparent); border-radius: 999px; transform: scaleX(0); transform-origin: left; transition: transform 1s ease 0.4s; }
        .how-connector-active { transform: scaleX(1) !important; }
        @media (min-width: 821px) { .how-connector-wrap { display: block; } }

@media (prefers-reduced-motion: reduce) {
          .how-orb { animation: none !important; }
          .step-num, .step-icon { transition: none !important; animation: none !important; opacity: 1 !important; transform: none !important; }
          .how-connector-line { transition: none !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// INTERACTIVE DEMO
// ============================================================
const PRESETS = [
  { label: "Mitocondria", text: `La mitocondria es un orgánulo de las células eucariotas que produce la mayor parte de la energía química necesaria para activar las reacciones bioquímicas de la célula. La energía química producida por las mitocondrias se almacena en una pequeña molécula llamada adenosín trifosfato (ATP). Las mitocondrias contienen su propio cromosoma (ADN mitocondrial) y generalmente se heredan únicamente de la madre.` },
  { label: "Teorema de Pitágoras", text: `En todo triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos. Si llamamos c a la hipotenusa, y a y b a los catetos: c² = a² + b². Este teorema permite calcular cualquiera de los lados conociendo los otros dos, y tiene aplicaciones en arquitectura, navegación, física y trigonometría.` },
  { label: "Revolución de Mayo", text: `La Revolución de Mayo fue una serie de acontecimientos políticos y sociales ocurridos durante la semana del 18 al 25 de mayo de 1810 en la ciudad de Buenos Aires. Significó la destitución del virrey Cisneros y la conformación de la Primera Junta, marcando el inicio del proceso de independencia del Virreinato del Río de la Plata respecto a la corona española.` },
];

type DemoMode = "puntos" | "resumen" | "flashcards";
type DemoOutput = { items?: string[] } | { resumen?: string } | { cards?: { q: string; a: string }[] } | null;

// Outputs pre-generados (NO llaman a la IA → cero costo de tokens y nada de abuso).
// Un ejemplo representativo por cada apunte (índice) y cada modo.
type DemoSet = { puntos: { items: string[] }; resumen: { resumen: string }; flashcards: { cards: { q: string; a: string }[] } };
const CANNED: DemoSet[] = [
  // 0 · Mitocondria
  {
    puntos: { items: [
      "La mitocondria es el orgánulo que genera la mayor parte de la energía de la célula.",
      "Esa energía se almacena en una molécula llamada ATP (adenosín trifosfato).",
      "Aparece en las células eucariotas, es decir, las que tienen núcleo.",
      "Tiene su propio ADN (el ADN mitocondrial), separado del núcleo celular.",
      "El ADN mitocondrial se hereda casi siempre por vía materna.",
    ] },
    resumen: { resumen: "La mitocondria es un orgánulo de las células eucariotas encargado de producir la mayor parte de la energía que la célula necesita para funcionar.\n\nEsa energía se almacena en una molécula llamada ATP (adenosín trifosfato), que actúa como la 'batería' de la célula.\n\nUna particularidad clave es que la mitocondria tiene su propio ADN —el ADN mitocondrial— y, a diferencia del resto del material genético, se hereda casi siempre de la madre." },
    flashcards: { cards: [
      { q: "¿Qué función cumple la mitocondria?", a: "Producir la mayor parte de la energía química de la célula." },
      { q: "¿En qué molécula se almacena esa energía?", a: "En el ATP (adenosín trifosfato)." },
      { q: "¿Qué células tienen mitocondrias?", a: "Las células eucariotas (las que tienen núcleo)." },
      { q: "¿Cómo se hereda el ADN mitocondrial?", a: "Generalmente por vía materna, de la madre." },
    ] },
  },
  // 1 · Teorema de Pitágoras
  {
    puntos: { items: [
      "En todo triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos.",
      "Se expresa con la fórmula c² = a² + b², donde c es la hipotenusa.",
      "La hipotenusa es el lado más largo, opuesto al ángulo de 90°.",
      "Permite calcular un lado conociendo los otros dos.",
      "Tiene aplicaciones en arquitectura, navegación, física y trigonometría.",
    ] },
    resumen: { resumen: "El teorema de Pitágoras es una de las relaciones más importantes de la geometría. Establece que, en cualquier triángulo rectángulo, el cuadrado de la hipotenusa equivale a la suma de los cuadrados de los catetos.\n\nSe expresa con la fórmula c² = a² + b², donde c es la hipotenusa (el lado más largo) y a y b son los catetos.\n\nGracias a esta relación, conociendo dos lados se puede calcular el tercero. Se usa en arquitectura, navegación, física y trigonometría." },
    flashcards: { cards: [
      { q: "¿Qué enuncia el teorema de Pitágoras?", a: "Que el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos." },
      { q: "¿Cuál es su fórmula?", a: "c² = a² + b²." },
      { q: "¿A qué triángulos se aplica?", a: "Solo a los triángulos rectángulos (con un ángulo de 90°)." },
      { q: "¿Qué es la hipotenusa?", a: "El lado más largo, opuesto al ángulo recto." },
    ] },
  },
  // 2 · Revolución de Mayo
  {
    puntos: { items: [
      "Fue una serie de hechos políticos ocurridos del 18 al 25 de mayo de 1810 en Buenos Aires.",
      "Terminó con la destitución del virrey Cisneros.",
      "Dio lugar a la formación de la Primera Junta de gobierno.",
      "Marcó el inicio del proceso de independencia del Virreinato del Río de la Plata.",
      "Significó el primer quiebre formal con la corona española.",
    ] },
    resumen: { resumen: "La Revolución de Mayo fue un conjunto de acontecimientos políticos y sociales ocurridos en Buenos Aires entre el 18 y el 25 de mayo de 1810.\n\nSu resultado más importante fue la destitución del virrey Cisneros y la conformación de la Primera Junta de gobierno, integrada por representantes locales.\n\nEste proceso marcó el inicio del camino hacia la independencia del Virreinato del Río de la Plata respecto de la corona española." },
    flashcards: { cards: [
      { q: "¿Cuándo ocurrió la Revolución de Mayo?", a: "Entre el 18 y el 25 de mayo de 1810." },
      { q: "¿A qué autoridad se destituyó?", a: "Al virrey Cisneros." },
      { q: "¿Qué órgano de gobierno se formó?", a: "La Primera Junta." },
      { q: "¿Qué proceso inició?", a: "El camino hacia la independencia del Virreinato del Río de la Plata." },
    ] },
  },
];

function TypingText({ text, speed = 14 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <>{displayed}</>;
}

function DemoEmpty({ mode }: { mode: DemoMode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.5)" }}>
      <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.7)", display: "grid", placeItems: "center", marginBottom: 16 }}>
        <IconSparkles size={28} />
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
        {mode === "puntos" ? "Puntos clave aparecerán acá" : mode === "resumen" ? "Tu resumen aparecerá acá" : "Tus flashcards aparecerán acá"}
      </div>
      <div style={{ fontSize: 13.5, marginTop: 6, color: "rgba(255,255,255,0.5)" }}>Tocá <b style={{ color: "rgba(255,255,255,0.8)" }}>Generar con IA</b> para ver la magia</div>
    </div>
  );
}

function DemoLoading({ mode }: { mode: DemoMode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[...Array(mode === "flashcards" ? 3 : 5)].map((_, i) => (
        <div key={i} className="shimmer" style={{ height: mode === "flashcards" ? 64 : 14, borderRadius: mode === "flashcards" ? 12 : 6, width: i === 0 ? "70%" : i === 4 ? "55%" : "100%" }} />
      ))}
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <span className="dot-pulse">●</span> Procesando con Claude...
      </div>
    </div>
  );
}

function FlashcardDeck({ cards }: { cards: { q: string; a: string }[] }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [appeared, setAppeared] = useState(false);
  const touchStartX = useRef(0);
  const card = cards[idx];

  useEffect(() => {
    setAppeared(false);
    const t = setTimeout(() => setAppeared(true), 30);
    return () => clearTimeout(t);
  }, [idx]);

  if (!card) return null;

  const goNext = () => { if (idx < cards.length - 1) { setIdx(idx + 1); setFlipped(false); } };
  const goPrev = () => { if (idx > 0) { setIdx(idx - 1); setFlipped(false); } };

  return (
    <div>
      <div
        onClick={() => setFlipped(f => !f)}
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          const diff = touchStartX.current - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 48) { diff > 0 ? goNext() : goPrev(); }
        }}
        style={{
          background: "rgba(255,255,255,0.92)", borderRadius: 16, padding: 28, minHeight: 180,
          cursor: "pointer", border: "1.5px solid rgba(255,255,255,0.5)",
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 8,
          position: "relative", userSelect: "none", touchAction: "pan-y",
          animation: appeared ? "popIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
        }}
      >
        <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          {flipped ? "Respuesta" : "Pregunta"}
        </div>
        <div style={{ fontSize: flipped ? 16 : 20, lineHeight: 1.4, color: "var(--ink)", fontWeight: flipped ? 400 : 600 }}>
          {flipped ? card.a : card.q}
        </div>
        <div style={{ position: "absolute", bottom: 12, right: 16, fontSize: 11, color: "var(--ink-softer)" }}>
          Tocá para {flipped ? "ver pregunta" : "ver respuesta"}
        </div>
      </div>
      <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.45)", margin: "8px 0 4px" }}>← deslizá para navegar →</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} disabled={idx === 0} onClick={goPrev}>← Anterior</button>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Carta <b>{idx + 1}</b> de {cards.length}</span>
        <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} disabled={idx === cards.length - 1} onClick={goNext}>Siguiente →</button>
      </div>
    </div>
  );
}

function DemoOutput({ mode, output }: { mode: DemoMode; output: DemoOutput }) {
  const o = output as Record<string, unknown>;
  if (mode === "puntos" && Array.isArray(o?.items)) {
    return (
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
        {(o.items as string[]).map((it, i) => (
          <li key={i} style={{
            display: "flex", gap: 12, padding: 12,
            background: "rgba(255,255,255,0.92)", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.4)",
            animation: `popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${i * 90}ms both`,
          }}>
            <div style={{ flex: "0 0 26px", height: 26, borderRadius: 8, background: "var(--accent)", color: "white", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700 }}>{i + 1}</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)" }}>{it}</div>
          </li>
        ))}
      </ul>
    );
  }
  if (mode === "resumen" && typeof o?.resumen === "string") {
    return (
      <div style={{
        padding: 18, background: "rgba(255,255,255,0.92)", borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.4)",
        fontSize: 15, lineHeight: 1.6, color: "var(--ink)", whiteSpace: "pre-wrap",
        animation: "popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <TypingText text={o.resumen} />
      </div>
    );
  }
  if (mode === "flashcards" && Array.isArray(o?.cards)) {
    return <FlashcardDeck cards={o.cards as { q: string; a: string }[]} />;
  }
  return <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Sin output válido.</div>;
}

export function Demo() {
  const [activePreset, setActivePreset] = useState(0);
  const [text, setText] = useState(PRESETS[0].text);
  const [mode, setMode] = useState<DemoMode>("puntos");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<DemoOutput>(null);
  const [pressing, setPressing] = useState<number | null>(null);

  const pickPreset = (i: number) => { setActivePreset(i); setText(PRESETS[i].text); setOutput(null); };

  const generate = () => {
    setLoading(true); setOutput(null);
    setTimeout(() => {
      setOutput(CANNED[activePreset][mode] as DemoOutput);
      setLoading(false);
    }, 1100);
  };

  return (
    <section className="section demo-aurora" style={{ position: "relative" }}>
      <div className="container-x">
        {/* Header con texto blanco sobre el fondo aurora */}
        <div className="reveal" style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
          <div style={{ marginBottom: 12, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.65)" }}>
            Prueba en vivo · sin registrarte
          </div>
          <h2 className="h-section" style={{ margin: 0, color: "#fff" }}>
            Mirá cómo funciona
          </h2>
          <p style={{ marginTop: 14, fontSize: 17, lineHeight: 1.55, color: "rgba(255,255,255,0.72)" }}>
            Seleccioná el apunte de ejemplo y generá, la IA hará el trabajo por vos, listo para estudiar.
          </p>
        </div>

        {/* Card con efecto glass sobre aurora */}
        <div className="reveal" style={{
          marginTop: 42, padding: 0, overflow: "hidden", borderRadius: 24,
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 28px 72px -16px rgba(26,15,56,0.55), inset 0 1px 0 rgba(255,255,255,0.18)",
        }}>
          {/* Toolbar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.07)", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.35)", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.25)", display: "inline-block" }} />
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
              </div>
              <span className="mono" style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>skillio.app/generar</span>
            </div>
            <span className="badge"><IconSparkles size={12} /> IA generativa</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr)" }} className="demo-grid">
            {/* LEFT — inputs */}
            <div style={{ padding: 24, borderRight: "1px solid rgba(255,255,255,0.10)" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Apunte de ejemplo</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => pickPreset(i)}
                    onPointerDown={() => setPressing(i)}
                    onPointerUp={() => setPressing(null)}
                    onPointerLeave={() => setPressing(null)}
                    style={{
                      padding: "6px 12px", fontSize: 13, fontWeight: 500, borderRadius: 999,
                      border: "1px solid " + (activePreset === i ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)"),
                      background: activePreset === i ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.10)",
                      color: activePreset === i ? "var(--accent-deep)" : "rgba(255,255,255,0.85)",
                      cursor: "pointer", fontFamily: "var(--font-sans)", touchAction: "manipulation",
                      transform: pressing === i ? "scale(0.90)" : "scale(1)",
                      transition: pressing === i
                        ? "transform 60ms ease"
                        : "transform 380ms cubic-bezier(0.34,1.56,0.64,1), background 150ms, border-color 150ms, color 150ms",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <textarea
                value={text}
                readOnly
                rows={9}
                aria-label="Apunte de ejemplo"
                style={{ width: "100%", resize: "none", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 14, padding: 14, fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.82)", outline: "none", cursor: "default" }}
              />
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Generar como</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {([{ v: "puntos", label: "Puntos clave" }, { v: "resumen", label: "Resumen" }, { v: "flashcards", label: "Flashcards" }] as { v: DemoMode; label: string }[]).map((m) => (
                    <button key={m.v} onClick={() => { setMode(m.v); setOutput(null); }} style={{
                      padding: "8px 14px", fontSize: 13.5, fontWeight: 600, borderRadius: 10,
                      border: "1px solid " + (mode === m.v ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.20)"),
                      background: mode === m.v ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
                      color: mode === m.v ? "var(--accent-deep)" : "rgba(255,255,255,0.8)",
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                      transition: "all 150ms ease", touchAction: "manipulation",
                    }}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className={"btn btn-primary jelly-btn" + (!loading && text.trim() ? " btn-pulse" : "")}
                style={{ marginTop: 18, width: "100%", fontSize: 15.5, fontWeight: 700, touchAction: "manipulation" }}
                onClick={generate}
                disabled={loading || !text.trim()}
              >
                {loading ? <><span className="dot-pulse">●</span> Generando...</> : <><IconSparkles size={16} /> Generar con IA</>}
              </button>
              <p style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center" }}>Costaría · 28 créditos PRO en la app real</p>
            </div>

            {/* RIGHT — output */}
            <div style={{ padding: 24, background: "rgba(0,0,0,0.08)", minHeight: 380 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                Output · {mode === "puntos" ? "Puntos clave" : mode === "resumen" ? "Resumen académico" : "Flashcards"}
              </div>
              {!output && !loading && <DemoEmpty mode={mode} />}
              {loading && <DemoLoading mode={mode} />}
              {output && !loading && <DemoOutput mode={mode} output={output} />}
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
          Ejemplo representativo de lo que Skillio genera en segundos. Creá tu cuenta para procesar tus propios apuntes.
        </p>
      </div>
      <style>{`
        @keyframes auroraFlow {
          0%,100% { background-position: 0% 50%; }
          33%      { background-position: 100% 30%; }
          66%      { background-position: 50% 100%; }
        }
        @keyframes popIn {
          from { transform: scale(0.80); opacity: 0; }
          60%  { transform: scale(1.05); }
          to   { transform: scale(1); opacity: 1; }
        }
        .demo-aurora {
          background: linear-gradient(-45deg, #1a0f38, #865CB8, #9655E5, #A67EFF, #885EA8, #1a0f38);
          background-size: 400% 400%;
          animation: auroraFlow 10s ease-in-out infinite;
        }
        .jelly-btn { transition: transform 380ms cubic-bezier(0.34,1.56,0.64,1) !important; }
        .jelly-btn:active { transform: scale(0.93) !important; transition: transform 60ms ease !important; }
        @media (max-width: 820px) {
          .demo-grid { grid-template-columns: 1fr !important; }
          .demo-grid > div:first-child { border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.10); }
        }
        @media (prefers-reduced-motion: reduce) {
          .demo-aurora { animation: none !important; background: #1a0f38 !important; }
          .jelly-btn:active { transform: none !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// TOOLKIT
// ============================================================
function AgendaCard() {
  return (
    <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 18, gridRow: "span 2" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(150,85,229,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Agenda con recordatorios</h3>
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>Tus parciales, TPs y entregas en un solo calendario</p>
          </div>
        </div>
        <span className="badge"><span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent)", display: "inline-block" }} className="dot-pulse" /> 3 esta semana</span>
      </div>
      <div style={{ background: "var(--paper-warm)", borderRadius: 16, padding: 16, border: "1px solid rgba(53,56,49,0.05)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 12 }}>
          {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} style={{ aspectRatio: "1", display: "grid", placeItems: "center", borderRadius: 10, fontSize: 13, fontWeight: 600, background: i === 2 ? "var(--accent)" : i === 4 ? "rgba(150,85,229,0.12)" : "transparent", color: i === 2 ? "white" : i === 4 ? "var(--accent)" : "var(--ink-soft)", border: i === 1 ? "1.5px solid var(--accent)" : "1px solid transparent" }}>
              <div style={{ textAlign: "center", lineHeight: 1.1 }}><div style={{ fontSize: 10, opacity: 0.7 }}>{d}</div><div>{14 + i}</div></div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { day: "Hoy · Miércoles", title: "Parcial · Anatomía II", time: "14:00", accent: true },
            { day: "Viernes", title: "Entregar TP · Estadística", time: "23:59", accent: false },
            { day: "Lunes próximo", title: "Repaso flashcards · Histología", time: "auto", accent: false },
          ].map((ev, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: ev.accent ? "rgba(150,85,229,0.08)" : "var(--paper)", borderRadius: 10, borderLeft: "3px solid " + (ev.accent ? "var(--accent)" : "rgba(53,56,49,0.2)") }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "var(--ink-softer)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{ev.day}</div>
                <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 600 }}>{ev.title}</div>
              </div>
              <div className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{ev.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PomodoroCard() {
  const [t, setT] = useState(25 * 60);
  const [run, setRun] = useState(false);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setT((x) => (x > 0 ? x - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [run]);
  const mins = String(Math.floor(t / 60)).padStart(2, "0");
  const secs = String(t % 60).padStart(2, "0");
  const pct = 1 - t / (25 * 60);
  const C = 2 * Math.PI * 54;
  return (
    <div className="card" style={{ padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(150,85,229,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8" /><path d="M12 5c0-2 1.5-3 3-3M12 5c0-2-1.5-3-3-3" /><path d="M12 5v3" /></svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Pomodoro</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>25 min focus · 5 break</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 0 4px" }}>
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--bg-2)" strokeWidth="8" />
            <circle cx="70" cy="70" r="54" fill="none" stroke="var(--accent)" strokeWidth="8" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} strokeLinecap="round" style={{ transition: "stroke-dashoffset .5s ease" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 38, color: "var(--ink)", letterSpacing: "-0.02em" }}>{mins}:{secs}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setRun((r) => !r)}>{run ? "Pausar" : "Empezar"}</button>
        <button className="btn btn-ghost" style={{ padding: "10px 14px" }} onClick={() => { setRun(false); setT(25 * 60); }}>Reset</button>
      </div>
    </div>
  );
}

function LogrosCard() {
  const logros = [
    { title: "Maratonista", desc: "Estudiá 7 días seguidos", pct: 100, unlocked: true },
    { title: "Curioso", desc: "10 preguntas al tutor IA", pct: 100, unlocked: true },
    { title: "Memoria fotográfica", desc: "50 flashcards repasadas", pct: 64, unlocked: false },
  ];
  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(150,85,229,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <IconTrophy size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Logros & XP</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>Tu nivel actual: <b style={{ color: "var(--accent)" }}>02 · Curioso</b> · 250 XP</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {logros.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, background: l.unlocked ? "rgba(150,85,229,0.06)" : "var(--paper-warm)", borderRadius: 12, border: "1px solid rgba(53,56,49,0.05)" }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, background: l.unlocked ? "var(--accent)" : "var(--bg-2)", color: l.unlocked ? "white" : "var(--ink-softer)", display: "grid", placeItems: "center", fontSize: 14 }}>
              {l.unlocked ? "✓" : "🔒"}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{l.title}</div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{l.desc}</div>
            </div>
            <div style={{ width: 60 }}>
              <div style={{ height: 5, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}><div className="progress-warm" style={{ height: "100%", width: l.pct + "%" }} /></div>
              <div style={{ fontSize: 11, color: "var(--ink-softer)", marginTop: 4, textAlign: "right" }}>{l.pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MateriasCard() {
  const materias = [
    { code: "ANA", name: "Anatomía II", color: "var(--accent)", pct: 78, parcial: "12 jun" },
    { code: "EST", name: "Estadística", color: "#4a6b8a", pct: 45, parcial: "20 jun" },
    { code: "HIS", name: "Historia", color: "#4a7c59", pct: 92, parcial: "aprobado" },
  ];
  return (
    <div className="card" style={{ padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(150,85,229,0.1)", color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Tus materias</h3>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-soft)" }}>Progreso por cursada</p>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {materias.map((m, i) => (
          <div key={i}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: m.color, color: "white", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{m.code}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: "var(--ink-softer)" }}>Parcial · {m.parcial}</div>
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: m.color }}>{m.pct}%</span>
            </div>
            <div style={{ height: 6, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden" }}><div className={m.color === "var(--accent)" ? "progress-warm" : ""} style={{ height: "100%", width: m.pct + "%", background: m.color === "var(--accent)" ? undefined : m.color, borderRadius: 999 }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Toolkit() {
  return (
    <section className="section" style={{ position: "relative" }}>
      <div className="container-x">
        <SectionHeader
          eyebrow="Más que IA"
          title={<>Skillio te <span className="gradient-text">ordena</span> la cursada entera</>}
          sub="Agenda, pomodoro y logros. Las herramientas que necesitás para no dejar todo para la última semana."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 18, marginTop: 42 }} className="toolkit-grid">
          <AgendaCard />
          <PomodoroCard />
          <LogrosCard />
          <MateriasCard />
        </div>
      </div>
      <style>{`@media (max-width: 880px) { .toolkit-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}
