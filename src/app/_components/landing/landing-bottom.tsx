"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { IconArrow, IconCheck, IconHeart, SkillioMark, CTAMicro } from "./landing-top";
import { SectionHeader } from "./landing-mid";

// ============================================================
// COMMUNITY
// ============================================================
function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="gradient-text" style={{ fontFamily: "var(--font-roboto)", fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>{n}</div>
      <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>{label}</div>
    </div>
  );
}

export function Community({ onCTA }: { onCTA: () => void }) {
  const items = [
    { author: "Luchi G.", uni: "UNC · Medicina", title: "Resumen Anatomía II — Cabeza y cuello", tag: "Resumen", likes: 248, color: "var(--accent)" },
    { author: "Mati P.", uni: "UTN · Sistemas", title: "Preguntero Sistemas Operativos (parcial 2)", tag: "Preguntero", likes: 192, color: "#4a6b8a" },
    { author: "Sofi R.", uni: "Siglo 21 · Abogacía", title: "Flashcards Derecho Civil", tag: "Flashcards", likes: 134, color: "#4a7c59" },
    { author: "Tomás L.", uni: "UBA · Económicas", title: "TP de Macroeconomía resuelto", tag: "TP", likes: 99, color: "var(--accent-2)" },
  ];
  return (
    <section id="comunidad" className="section" style={{ background: "var(--bg-2)", position: "relative", overflow: "hidden" }}>
      <div className="container-x" style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 40, alignItems: "center" }} className="community-grid">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 12, color: "var(--accent)" }}>Comunidad Skillio</div>
            <h2 className="h-section" style={{ margin: 0 }}>
              Apuntes, pregunteros y TPs de otros estudiantes. <span className="gradient-text">Gratis.</span>
            </h2>
            <p style={{ marginTop: 16, fontSize: 17, lineHeight: 1.55, color: "var(--ink-soft)" }}>
              Todos los estudiantes suben lo que tienen: resúmenes que les sirvieron, parciales viejos, flashcards armadas. Sumate, descargá lo que necesites y compartí lo tuyo.
            </p>
            <div style={{ display: "flex", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
              <Stat n="12k+" label="Apuntes compartidos" />
              <Stat n="3.5k" label="Pregunteros" />
              <Stat n="1.2k+" label="Estudiantes activos" />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 28 }} onClick={onCTA}>
              Explorar comunidad <IconArrow size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            {items.map((it, i) => (
              <div key={i} className={`card lift${i % 2 === 1 ? " community-card-odd" : ""}`} style={{ padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 999, background: it.color, color: "white", display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 18, flexShrink: 0 }}>{it.author[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-softer)" }}><b style={{ color: "var(--ink-soft)" }}>{it.author}</b> · {it.uni}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "var(--bg-2)", color: it.color, letterSpacing: "0.02em", flexShrink: 0 }}>{it.tag}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--ink-softer)", fontSize: 13, flexShrink: 0 }}><IconHeart size={14} /> {it.likes}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 880px) { .community-grid { grid-template-columns: 1fr !important; } .community-card-odd { margin-left: 0 !important; } } @media (min-width: 881px) { .community-card-odd { margin-left: 24px; } }`}</style>
    </section>
  );
}

// ============================================================
// PRUEBA SOCIAL — testimonios con foto + resultado concreto
// ============================================================
function Avatar({ src, name, color }: { src: string; name: string; color: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div style={{ width: 52, height: 52, borderRadius: 999, background: color, color: "white", display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 22, flexShrink: 0 }}>
        {name[0]}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={"/landing/testimonios/" + src} alt={name} onError={() => setFailed(true)} style={{ width: 52, height: 52, borderRadius: 999, objectFit: "cover", flexShrink: 0, border: "2px solid var(--paper)" }} />
  );
}

function MetricCounter({ to, format, active }: { to: number; format: (n: number) => string; active: boolean }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    const steps = 50;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVal(Math.round((i / steps) * to));
      if (i >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [active, to]);
  return <>{format(val)}</>;
}

export function Testimonios() {
  const [active, setActive] = useState(0);
  const [dotKey, setDotKey] = useState(0);
  const [sectionIn, setSectionIn] = useState(false);
  const [metricActive, setMetricActive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const autoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = [
    { src: "sofi.jpg",  name: "Sofi R.",  handle: "@Sofir_uba",  uni: "UBA - Medicina",       color: "var(--accent)", quote: "Anatomia con 8 en 3 dias. El resumen me salvo una semana entera de lectura. Amo esta app! #SkillioWorks" },
    { src: "mati.jpg",  name: "Mati P.",  handle: "@MatiP_dev",  uni: "UTN - Sistemas",        color: "#4a6b8a",       quote: "El simulacro fue casi identico al parcial real. Cero nervios y aprobe Sistemas Operativos. #Gracias" },
    { src: "luchi.jpg", name: "Luchi G.", handle: "@LuchiG_der", uni: "UNC - Derecho",         color: "#4a7c59",       quote: "Las flashcards con repaso espaciado me salvaron en el final. Por fin me quedan las cosas en la cabeza." },
    { src: "juli.jpg",  name: "Juli M.",  handle: "@JuliM_psi",  uni: "Siglo 21 - Psicologia", color: "#7c3fcf",       quote: "Tiraba la foto del apunte y tenia el resumen al toque. Deje de procrastinar leyendo 200 paginas." },
    { src: "fran.jpg",  name: "Fran D.",  handle: "@FranD_eco",  uni: "UCC - Economicas",      color: "#4a6b8a",       quote: "Subi el PDF de 180 paginas y en minutos sabia exactamente que estudiar. Recursaba esa materia." },
    { src: "cami.jpg",  name: "Cami T.",  handle: "@CamiT_uba",  uni: "UBA - Abogacia",        color: "var(--accent)", quote: "Estudio la mitad del tiempo y me va mejor. Lo recomende a toda mi comision. Una joya!" },
  ];

  const metrics = [
    { to: 1200, format: (n: number) => "+" + (n >= 1000 ? "1." + String(Math.round(n % 1000)).padStart(3, "0") : String(n)), label: "estudiantes activos" },
    { to: 12,   format: (n: number) => n + "k+",                                                                               label: "apuntes generados" },
    { to: 35,   format: (n: number) => (n / 10).toFixed(1) + "k",                                                              label: "simulacros hechos" },
  ];

  const scrollToCard = useCallback((i: number) => {
    if (!trackRef.current) return;
    trackRef.current.scrollTo({ left: i * (trackRef.current.clientWidth * 0.85 + 16), behavior: "smooth" });
  }, []);

  const startAuto = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    setDotKey(k => k + 1);
    autoTimer.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % items.length;
        scrollToCard(next);
        return next;
      });
      setDotKey(k => k + 1);
    }, 4000);
  }, [items.length, scrollToCard]);

  useEffect(() => {
    startAuto();
    return () => { if (autoTimer.current) clearInterval(autoTimer.current); };
  }, [startAuto]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSectionIn(true); setTimeout(() => setMetricActive(true), 400); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const onScroll = () => {
    if (!trackRef.current) return;
    const cardW = trackRef.current.clientWidth * 0.85 + 16;
    const newActive = Math.min(Math.round(trackRef.current.scrollLeft / cardW), items.length - 1);
    if (newActive !== active) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
      setActive(newActive);
      startAuto();
    }
  };

  return (
    <section ref={sectionRef} className="section" style={{ background: "linear-gradient(180deg, #F5F0FF 0%, #E4DEFF 100%)", padding: "72px 0", overflow: "hidden" }}>

      {/* Encabezado */}
      <div className="reveal" style={{ textAlign: "center", padding: "0 24px", marginBottom: 36 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 14 }}>
          Prueba Social
        </div>
        <h2 className="h-section" style={{ margin: "0 auto", maxWidth: 560 }}>
          Estudiantes que ya <em className="gradient-text" style={{ fontStyle: "italic", fontWeight: 800 }}>aprobaron</em> con Skillio
        </h2>
        <p style={{ marginTop: 14, fontSize: 16.5, lineHeight: 1.55, color: "var(--ink-soft)", maxWidth: 440, margin: "14px auto 0" }}>
          Resultados reales, no promesas. Esto es lo que pasa cuando estudias distinto.
        </p>
      </div>

      {/* Carrusel */}
      <div style={{ position: "relative" }}>
        <button onClick={() => { scrollToCard(Math.max(0, active - 1)); startAuto(); }} disabled={active === 0} aria-label="Anterior" className="testi-arrow testi-arrow-left">&#8249;</button>

        <div
          ref={trackRef}
          onScroll={onScroll}
          className="testimonios-track"
          style={{
            display: "flex", overflowX: "auto", gap: 16,
            paddingLeft: "7.5vw", paddingRight: "7.5vw", paddingBottom: 12,
            scrollSnapType: "x mandatory", overscrollBehavior: "contain",
            scrollbarWidth: "none", msOverflowStyle: "none" as React.CSSProperties["msOverflowStyle"],
          }}
        >
          {items.map((it, i) => (
            <div
              key={i}
              style={{
                flexShrink: 0, width: "min(85vw, 340px)", scrollSnapAlign: "center",
                background: "#fff", borderRadius: 20, padding: 24,
                display: "flex", flexDirection: "column", gap: 14,
                transform: active === i ? "scale(1.02)" : "scale(0.96)",
                opacity: active === i ? 1 : 0.72,
                boxShadow: active === i
                  ? "0 10px 40px rgba(134,92,184,0.20), 0 2px 8px rgba(134,92,184,0.10)"
                  : "0 2px 12px rgba(134,92,184,0.07)",
                transition: "transform 320ms cubic-bezier(0.34,1.56,0.64,1), opacity 320ms ease, box-shadow 320ms ease",
              }}
            >
              {/* Avatar con ring + pop-in */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  className={sectionIn ? "testi-avatar-in" : "testi-avatar-wrap"}
                  style={{ animationDelay: `${i * 70}ms`, flexShrink: 0 }}
                >
                  <div style={{ background: "linear-gradient(135deg, #865CB8, #A67EFF)", borderRadius: "50%", padding: 2 }}>
                    <div style={{ background: "#fff", borderRadius: "50%", padding: 1 }}>
                      <Avatar src={it.src} name={it.name} color={it.color} />
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)", lineHeight: 1.2 }}>{it.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-softer)", marginTop: 1 }}>{it.handle}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-softer)", marginTop: 2 }}>{it.uni}</div>
                </div>
              </div>

              <div style={{ fontSize: 19, letterSpacing: 1, lineHeight: 1 }}>&#11088;&#11088;&#11088;&#11088;&#11088;</div>

              {/* Quote con fade al centrarse */}
              <p
                key={active === i ? "a" : "i"}
                className={active === i ? "testi-quote-active" : ""}
                style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "var(--ink)" }}
              >
                {it.quote}
              </p>
            </div>
          ))}
        </div>

        <button onClick={() => { scrollToCard(Math.min(items.length - 1, active + 1)); startAuto(); }} disabled={active === items.length - 1} aria-label="Siguiente" className="testi-arrow testi-arrow-right">&#8250;</button>
      </div>

      {/* Dots con progreso */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => { scrollToCard(i); startAuto(); }}
            aria-label={"Ir al testimonio " + (i + 1)}
            style={{
              position: "relative", overflow: "hidden",
              width: active === i ? 28 : 8, height: 8,
              borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
              background: active === i ? "var(--accent)" : "rgba(134,92,184,0.22)",
              transition: "width 0.3s ease, background 0.3s ease",
            }}
          >
            {active === i && <span key={dotKey} className="dot-progress" />}
          </button>
        ))}
      </div>

      <p className="testi-hint" style={{ textAlign: "center", fontSize: 13, color: "var(--ink-softer)", marginTop: 10 }}>
        Desliza horizontal &#x1F449;
      </p>

      {/* Metricas con halo diagonal y contador */}
      <div style={{ display: "flex", justifyContent: "center", gap: "20px 48px", marginTop: 52, flexWrap: "wrap", textAlign: "center", padding: "0 24px" }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ position: "relative" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div className="metric-halo" />
              <div className="gradient-text" style={{ fontFamily: "var(--font-roboto)", fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", position: "relative", zIndex: 1 }}>
                <MetricCounter to={m.to} format={m.format} active={metricActive} />
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px 24px", marginTop: 28, flexWrap: "wrap", opacity: 0.55, padding: "0 24px" }}>
        {["UBA", "UNC", "UTN", "Siglo 21", "UCC"].map((u) => (
          <span key={u} style={{ fontFamily: "var(--font-roboto)", fontWeight: 800, fontSize: 17, color: "var(--ink-soft)", letterSpacing: "-0.02em" }}>{u}</span>
        ))}
      </div>

      <style>{`
        .testimonios-track::-webkit-scrollbar { display: none; }

        /* Avatar pop-in con ring */
        .testi-avatar-wrap { opacity: 0; }
        @keyframes avatarPop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .testi-avatar-in { animation: avatarPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both; }

        /* Quote fade cuando la card esta centrada */
        @keyframes quoteIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .testi-quote-active { animation: quoteIn 0.35s ease both; }

        /* Dot progreso (se llena en 4s) */
        @keyframes dotFill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        .dot-progress {
          position: absolute; inset: 0; border-radius: 999px;
          background: rgba(255,255,255,0.45);
          transform-origin: left; pointer-events: none;
          animation: dotFill 4s linear both;
        }

        /* Halo diagonal en numeros */
        .metric-halo {
          position: absolute;
          inset: -10px -14px;
          background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(166,126,255,0.40) 45%, transparent 68%);
          border-radius: 14px;
          pointer-events: none;
          z-index: 0;
        }

        /* Flechas desktop */
        .testi-arrow {
          display: none; position: absolute; top: 50%; transform: translateY(-50%);
          z-index: 2; width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.9); border: 1px solid rgba(134,92,184,0.2);
          font-size: 24px; cursor: pointer; color: var(--accent);
          box-shadow: 0 2px 12px rgba(134,92,184,0.15); transition: opacity 150ms ease;
        }
        .testi-arrow:disabled { opacity: 0.28; cursor: default; }
        .testi-arrow-left  { left: 8px; }
        .testi-arrow-right { right: 8px; }
        @media (min-width: 640px) { .testi-arrow { display: grid; place-items: center; } .testi-hint { display: none; } }

        @media (prefers-reduced-motion: reduce) {
          .testi-avatar-wrap { opacity: 1 !important; }
          .testi-avatar-in, .testi-quote-active, .dot-progress { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

// ============================================================
// TRANSFORMACIÓN — pintar el "después"
// ============================================================
export function Transformacion() {
  return (
    <section className="section" style={{ position: "relative", overflow: "hidden" }} >
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }} className="grid-bg fade" />
      <div className="container-x" style={{ position: "relative", zIndex: 2, maxWidth: 760, textAlign: "center" }}>
        <div className="eyebrow reveal" style={{ marginBottom: 14, color: "var(--accent)" }}>La noche antes del parcial</div>
        <h2 className="h-section reveal" style={{ margin: "0 auto" }}>
          Imaginate llegar al parcial <span className="gradient-text">tranquilo</span>.
        </h2>
        <p className="reveal" style={{ margin: "20px auto 0", maxWidth: 620, fontSize: "clamp(17px, 1.9vw, 21px)", lineHeight: 1.6, color: "var(--ink-soft)" }}>
          Sin maratón de lectura a las 3 de la mañana. Todo repasado, las flashcards al día,
          el simulacro hecho. Cerrás los ojos sabiendo que estudiaste bien — y dormís.
          <br /><br />
          <b style={{ color: "var(--ink)" }}>Eso es estudiar con Skillio.</b>
        </p>
      </div>
    </section>
  );
}

// ============================================================
// PRICING
// ============================================================
type PricingCycle = "semanal" | "mensual" | "trimestral";

export function Pricing({ onCTA }: { onCTA: () => void }) {
  const [cycle, setCycle] = useState<PricingCycle>("mensual");

  const plans: Record<PricingCycle, { price: string; period: string; label: string; saving: string | null }> = {
    semanal:    { price: "$4.900",  period: "semana",    label: "Semanal",    saving: null },
    mensual:    { price: "$15.900", period: "mes",       label: "Mensual",    saving: null },
    trimestral: { price: "$34.900", period: "trimestre", label: "Trimestral", saving: "Ahorras 30%" },
  };

  const perks = [
    "Resumenes, flashcards y simulacros ilimitados",
    "Repeticion espaciada inteligente",
    "Modelos avanzados de IA (Claude)",
    "Subi tus apuntes: PDF, foto o texto",
    "Cancelas en cualquier momento",
  ];

  const current = plans[cycle];

  return (
    <section id="planes" className="section" style={{ background: "#F8F7FF" }}>
      <div className="container-x">

        {/* Header */}
        <div className="reveal" style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
            Planes
          </div>
          <h2 className="h-section" style={{ margin: "0 auto", maxWidth: 520 }}>
            Un plan para <span className="gradient-text">aprobar</span> sin volverte loco
          </h2>
          <p style={{ marginTop: 14, fontSize: 16.5, lineHeight: 1.55, color: "var(--ink-soft)", maxWidth: 420, margin: "14px auto 0" }}>
            Proba gratis. Cuando quieras mas, activas PRO en 2 clicks.
          </p>
        </div>

        {/* Tarjeta principal */}
        <div style={{
          maxWidth: 440, margin: "0 auto",
          background: "#fff", borderRadius: 28, padding: "32px 28px",
          boxShadow: "0 8px 48px rgba(124,58,237,0.10), 0 1px 4px rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.10)",
        }}>

          {/* Badge PRO */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "linear-gradient(135deg, #865CB8 0%, #9655E5 100%)",
              color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "0.08em",
              padding: "6px 18px", borderRadius: 999,
              boxShadow: "0 4px 16px rgba(150,85,229,0.35)",
            }}>
              PRO
            </span>
          </div>

          {/* Precio dinamico */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div key={cycle} className="price-appear" style={{
              fontFamily: "var(--font-jakarta)", fontSize: 52, fontWeight: 900,
              letterSpacing: "-0.03em", lineHeight: 1, color: "var(--ink)",
            }}>
              {current.price}
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-softer)", marginTop: 4 }}>
              por {current.period}
            </div>
          </div>

          {/* Selector de ciclos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
            {(["semanal", "mensual", "trimestral"] as PricingCycle[]).map((key) => {
              const p = plans[key];
              const isActive = cycle === key;
              return (
                <button
                  key={key}
                  onClick={() => setCycle(key)}
                  style={{
                    position: "relative", padding: "12px 6px 10px",
                    borderRadius: 14, cursor: "pointer", textAlign: "center",
                    border: isActive ? "2px solid #7c3aed" : "1.5px solid rgba(0,0,0,0.10)",
                    background: isActive ? "#F5F3FF" : "#fff",
                    transition: "border-color 180ms ease, background 180ms ease, box-shadow 180ms ease",
                    boxShadow: isActive ? "0 0 0 3px rgba(124,58,237,0.10)" : "none",
                    fontFamily: "var(--font-jakarta)",
                  }}
                >
                  {/* Badge "Mas elegido" en mensual */}
                  {key === "mensual" && (
                    <span style={{
                      position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                      background: "var(--ink)", color: "#fff", fontSize: 10, fontWeight: 700,
                      padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
                    }}>
                      &#x1F525; Mas elegido
                    </span>
                  )}

                  {/* Check cuando activo */}
                  {isActive && (
                    <span style={{
                      position: "absolute", top: 6, right: 6,
                      width: 16, height: 16, borderRadius: 999,
                      background: "#7c3aed", color: "#fff",
                      display: "grid", placeItems: "center", fontSize: 10,
                    }}>
                      <IconCheck size={9} stroke={3} />
                    </span>
                  )}

                  <div style={{ fontWeight: 700, fontSize: 13, color: isActive ? "#7c3aed" : "var(--ink)", marginBottom: 2 }}>
                    {p.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-softer)", lineHeight: 1.3 }}>
                    {p.price}
                  </div>

                  {/* Badge ahorro en trimestral */}
                  {key === "trimestral" && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", marginTop: 3 }}>
                      {p.saving}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <button
            onClick={onCTA}
            style={{
              width: "100%", padding: "16px 24px", borderRadius: 999,
              background: "linear-gradient(135deg, #865CB8 0%, #9655E5 100%)",
              color: "#fff", fontWeight: 700, fontSize: 17,
              border: "none", cursor: "pointer", fontFamily: "var(--font-jakarta)",
              boxShadow: "0 8px 24px rgba(150,85,229,0.35)",
              transition: "transform 150ms ease, box-shadow 150ms ease",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 12px 32px rgba(150,85,229,0.45)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 24px rgba(150,85,229,0.35)"; }}
          >
            Continuar con el plan {current.label} <IconArrow size={18} />
          </button>

          <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink-softer)", margin: "12px 0 0" }}>
            Pago seguro. Cancelas en cualquier momento.
          </p>

          {/* Divisor */}
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "24px 0" }} />

          {/* Features */}
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 13 }}>
            {perks.map((p, i) => (
              <li key={i} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "var(--ink)" }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                  background: "#F5F3FF", color: "#7c3aed",
                  display: "grid", placeItems: "center",
                }}>
                  <IconCheck size={12} stroke={2.5} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--ink-softer)" }}>
          Proba gratis y sin tarjeta &middot; Pagos seguros con Mercado Pago
        </p>
      </div>

      <style>{`
        @keyframes priceAppear {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .price-appear { animation: priceAppear 0.22s ease both; }
      `}</style>
    </section>
  );
}

// ============================================================
// FAQ
// ============================================================
export function FAQ() {
  const items = [
    { q: "¿De verdad es gratis y sin tarjeta?", a: "Sí. Entrás, probás PRO y tenés 3 generaciones gratis sin poner ninguna tarjeta. Recién cuando se te acaban los intentos y querés seguir, pasás a PRO." },
    { q: "¿Mis apuntes y datos son seguros?", a: "Sí. Tus apuntes son privados por default. Nadie ve nada salvo que vos decidas compartirlo en la Comunidad. Usamos cifrado en tránsito y en reposo." },
    { q: "¿Qué tan precisa es la IA?", a: "Muy buena para resumir, generar flashcards y simulacros. Igual: siempre revisá los resultados. La IA es una copilota, no reemplaza estudiar." },
    { q: "¿Puedo subir cualquier formato?", a: "Sí: PDFs, fotos de pizarrón o apuntes, fotos de hojas escritas a mano. Si lo podés leer vos, lo puede leer Skillio." },
    { q: "¿Cómo pago el plan PRO?", a: "A través de Mercado Pago con tarjeta de crédito o débito. Te adherís al débito automático y podés cancelar cuando quieras en 2 clicks." },
    { q: "¿Sirve para mi carrera?", a: "Sí. Funciona para Medicina, Ingenierías, Derecho, Económicas, Psicología, profesorados, secundario. Cualquier materia que tenga texto." },
  ];
  return (
    <section id="faq" className="section">
      <div className="container-x" style={{ maxWidth: 880 }}>
        <SectionHeader eyebrow="Dudas frecuentes" title="Lo que se pregunta todo el mundo" />
        <div style={{ marginTop: 32 }}>
          {items.map((it, i) => (
            <details key={i} className="faq">
              <summary>
                <span>{it.q}</span>
                <span className="plus">+</span>
              </summary>
              <div className="body">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FINAL CTA
// ============================================================
export function FinalCTA({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="section" style={{ position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }} className="grid-bg fade" />
      <div className="container-x" style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <h2 className="h-section" style={{ margin: "0 auto", maxWidth: 720 }}>
          Tu próximo parcial puede ser <span className="gradient-text">distinto</span>.
        </h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 32 }}>
          <button className="btn btn-primary btn-lg btn-pulse" onClick={onCTA} style={{ fontSize: 17 }}>
            Empezá gratis hoy <IconArrow size={18} />
          </button>
          <CTAMicro />
        </div>
      </div>
    </section>
  );
}

// ============================================================
// FOOTER
// ============================================================
function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(248,247,255,0.55)", marginBottom: 16 }}>{title}</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map(([label, href], i) => (
          <li key={i}><a href={href} className="footer-link">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer style={{ background: "#1a0f38", color: "#F0EDFF", paddingTop: 64, paddingBottom: 28, marginTop: 40 }}>
      <div className="container-x">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3, 1fr)", gap: 40 }} className="footer-grid">
          <div>
            <SkillioMark color="#f8f7ff" size={28} />
            <p style={{ marginTop: 14, fontSize: 14, color: "rgba(248,247,255,0.6)", lineHeight: 1.55, maxWidth: 320 }}>
              Tu copiloto de estudio. Hecho en Argentina 🇦🇷 por estudiantes para estudiantes.
            </p>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: "#00b1ea", display: "grid", placeItems: "center", color: "white", fontSize: 13, fontWeight: 700 }}>M</div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(248,247,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pasarela segura</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Mercado Pago</div>
                </div>
              </div>
            </div>
          </div>
          <FooterCol title="Producto" links={[["Funciones", "#funciones"], ["Cómo funciona", "#como"], ["Planes", "#planes"], ["Comunidad", "#comunidad"]]} />
          <FooterCol title="Empresa" links={[["Sobre nosotros", "#"], ["Blog", "#"], ["Contacto", "mailto:info.skillioapp@gmail.com"]]} />
          <FooterCol title="Legal" links={[["Términos y condiciones", "/terminos"], ["Política de privacidad", "/privacidad"], ["Política de cookies", "/privacidad#cookies"], ["Seguridad", "/privacidad#seguridad"]]} />
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "40px 0 24px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: 13, color: "rgba(248,247,255,0.5)" }}>
          <div>© 2026 Skillio · Argentina</div>
          <div style={{ display: "flex", gap: 16 }}>
            <a href="#" className="footer-link">Instagram</a>
            <a href="#" className="footer-link">TikTok</a>
            <a href="#" className="footer-link">YouTube</a>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 720px) { .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 28px !important; } }
        @media (max-width: 460px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
