"use client";

import { useState } from "react";
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

export function Testimonios() {
  const items = [
    { src: "sofi.jpg", name: "Sofi R.", uni: "UBA · Medicina", color: "var(--accent)", quote: "Aprobé Anatomía con 8 estudiando 3 días. Los resúmenes me ahorraron una semana de leer." },
    { src: "mati.jpg", name: "Mati P.", uni: "UTN · Sistemas", color: "#4a6b8a", quote: "El simulacro fue casi igual al parcial real. Llegué sin nervios y pasé Sistemas Operativos." },
    { src: "luchi.jpg", name: "Luchi G.", uni: "UNC · Derecho", color: "#4a7c59", quote: "Las flashcards con repaso me salvaron en el final. Por fin me quedan las cosas." },
    { src: "juli.jpg", name: "Juli M.", uni: "Siglo 21 · Psicología", color: "var(--accent-2)", quote: "Tiraba la foto del apunte y tenía el resumen al toque. Dejé de procrastinar leyendo." },
    { src: "fran.jpg", name: "Fran D.", uni: "UCC · Económicas", color: "#4a6b8a", quote: "Subí el PDF de 180 páginas y en minutos sabía qué estudiar. Recursaba esa materia." },
    { src: "cami.jpg", name: "Cami T.", uni: "UBA · Abogacía", color: "var(--accent)", quote: "Estudio la mitad del tiempo y me va mejor. Lo recomendé a toda mi comisión." },
  ];
  return (
    <section className="section" style={{ background: "var(--bg-2)" }}>
      <div className="container-x">
        <SectionHeader
          eyebrow="Prueba social"
          title={<>Estudiantes que ya <span className="gradient-text">aprobaron</span> con Skillio</>}
          sub="Resultados reales, no promesas. Esto es lo que pasa cuando estudiás distinto."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, marginTop: 44 }}>
          {items.map((it, i) => (
            <div key={i} className="card reveal" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: "var(--ink)" }}>“{it.quote}”</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
                <Avatar src={it.src} name={it.name} color={it.color} />
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink)" }}>{it.name}</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-softer)" }}>{it.uni}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Métricas + universidades */}
        <div style={{ display: "flex", justifyContent: "center", gap: "20px 48px", marginTop: 48, flexWrap: "wrap", textAlign: "center" }}>
          {[["+1.200", "estudiantes activos"], ["12k+", "apuntes compartidos"], ["3.5k", "pregunteros"]].map(([n, l]) => (
            <div key={l}>
              <div className="gradient-text" style={{ fontFamily: "var(--font-roboto)", fontSize: 40, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>{n}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px 24px", marginTop: 28, flexWrap: "wrap", opacity: 0.6 }}>
          {["UBA", "UNC", "UTN", "Siglo 21", "UCC"].map((u) => (
            <span key={u} style={{ fontFamily: "var(--font-roboto)", fontWeight: 800, fontSize: 17, color: "var(--ink-soft)", letterSpacing: "-0.02em" }}>{u}</span>
          ))}
        </div>
      </div>
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
export function Pricing({ onCTA }: { onCTA: () => void }) {
  const proPerks = [
    "500 créditos mensuales de IA",
    "Resúmenes, flashcards y simulacros ilimitados",
    "Repetición espaciada inteligente",
    "Modelos avanzados de IA",
    "Subir a Comunidad y ganar XP",
    "Pomodoro, agenda y logros",
  ];
  // Bullets del señuelo Premium — se ven difuminados a propósito (no son reales).
  const premiumPerks = [
    "Modelos de IA más avanzados",
    "Tutor IA personalizado 24/7",
    "Generaciones ilimitadas",
    "Soporte prioritario",
    "Modo examen colaborativo",
  ];

  return (
    <section id="planes" className="section">
      <div className="container-x">
        <SectionHeader
          eyebrow="Planes"
          title={<>Elegí cómo querés <span className="gradient-text">aprobar</span></>}
          sub="Probás gratis y sin tarjeta. Cuando se te acaban los intentos, pasás a PRO en 2 clicks."
        />

        <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 46, maxWidth: 820, marginLeft: "auto", marginRight: "auto", alignItems: "stretch" }}>
          {/* ── PRO — plan real, recomendado ── */}
          <div style={{ background: "var(--accent)", color: "#fff", borderRadius: 24, padding: 32, border: "1.5px solid var(--accent)", position: "relative", boxShadow: "0 24px 48px -20px rgba(165,64,45,0.5)", transform: "scale(1.02)", zIndex: 2 }}>
            <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", padding: "5px 14px", borderRadius: 999, background: "var(--ink)", color: "white", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>⭐ El más elegido</span>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, letterSpacing: "-0.02em", lineHeight: 1 }}>PRO</div>
            <div style={{ marginTop: 6, fontSize: 14, opacity: 0.8 }}>Todo lo que necesitás para aprobar</div>
            <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 54, letterSpacing: "-0.025em", lineHeight: 1 }}>$16.000</span>
              <span style={{ fontSize: 14, opacity: 0.75 }}>/ mes</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>Menos que una hamburguesa al mes — contra recursar una materia.</div>
            <button className="btn" style={{ width: "100%", marginTop: 20, background: "white", color: "var(--accent)", fontWeight: 700 }} onClick={onCTA}>
              Empezá gratis <IconArrow size={16} />
            </button>
            <p style={{ textAlign: "center", margin: "10px 0 0", fontSize: 12.5, opacity: 0.85 }}>Sin tarjeta · Cancelás cuando quieras</p>
            <div style={{ height: 1, background: "rgba(255,255,255,0.25)", margin: "24px 0" }} />
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {proPerks.map((t, j) => (
                <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: "rgba(255,255,255,0.25)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <IconCheck size={12} stroke={2.5} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── PREMIUM — señuelo de anclaje. SOLO VISUAL, no funcional, no clickeable. ── */}
          <div style={{ background: "var(--paper)", color: "var(--ink)", borderRadius: 24, padding: 32, border: "1px solid rgba(53,56,49,0.10)", position: "relative", overflow: "hidden", boxShadow: "0 1px 0 rgba(53,56,49,0.04)" }}>
            {/* Ribbon diagonal "PRÓXIMAMENTE" */}
            <div aria-hidden style={{ position: "absolute", top: 18, right: -52, transform: "rotate(45deg)", background: "linear-gradient(135deg, #4a6b8a, #2c5870)", color: "white", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", padding: "6px 60px", boxShadow: "0 4px 12px -4px rgba(44,88,112,0.6)" }}>
              PRÓXIMAMENTE
            </div>
            <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, letterSpacing: "-0.02em", lineHeight: 1 }}>Premium</div>
            <div style={{ marginTop: 6, fontSize: 14, color: "var(--ink-soft)" }}>Todo lo de PRO, llevado al límite.</div>
            {/* Precio: ancla — nítido y legible a propósito */}
            <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 54, letterSpacing: "-0.025em", lineHeight: 1, color: "var(--ink)", fontWeight: 700 }}>$29.999</span>
              <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>/ mes</span>
            </div>
            <button disabled aria-disabled style={{ width: "100%", marginTop: 20, padding: "12px 22px", borderRadius: 999, border: "1px solid rgba(53,56,49,0.12)", background: "var(--bg-2)", color: "var(--ink-softer)", fontWeight: 600, fontSize: 15, cursor: "not-allowed", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "var(--font-jakarta)" }}>
              🔒 Próximamente
            </button>
            <div style={{ height: 1, background: "rgba(53,56,49,0.08)", margin: "24px 0" }} />
            {/* Features difuminadas — generan intriga, no se leen del todo */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12, filter: "blur(5px)", userSelect: "none", pointerEvents: "none", opacity: 0.85 }} aria-hidden>
              {premiumPerks.map((t, j) => (
                <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 999, background: "rgba(53,56,49,0.10)", color: "var(--ink-soft)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <IconCheck size={12} stroke={2.5} />
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            {/* Overlay vidrio esmerilado para reforzar el "bloqueado" */}
            <div aria-hidden style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "46%", background: "linear-gradient(to top, rgba(255,255,255,0.55), transparent)", backdropFilter: "blur(1.5px)", pointerEvents: "none" }} />
          </div>
        </div>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--ink-softer)" }}>
          Probás gratis y sin tarjeta · Cancelás cuando quieras · Pagos seguros con Mercado Pago
        </p>
      </div>
      <style>{`@media (max-width: 720px) { .pricing-grid { grid-template-columns: 1fr !important; } .pricing-grid > div:first-child { transform: none !important; } }`}</style>
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
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(251,241,239,0.55)", marginBottom: 16 }}>{title}</div>
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
    <footer style={{ background: "#22241e", color: "#fbf1ef", paddingTop: 64, paddingBottom: 28, marginTop: 40 }}>
      <div className="container-x">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(3, 1fr)", gap: 40 }} className="footer-grid">
          <div>
            <SkillioMark color="#fbf1ef" size={28} />
            <p style={{ marginTop: 14, fontSize: 14, color: "rgba(251,241,239,0.6)", lineHeight: 1.55, maxWidth: 320 }}>
              Tu copiloto de estudio. Hecho en Argentina 🇦🇷 por estudiantes para estudiantes.
            </p>
            <div style={{ marginTop: 22, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: "#00b1ea", display: "grid", placeItems: "center", color: "white", fontSize: 13, fontWeight: 700 }}>M</div>
                <div>
                  <div style={{ fontSize: 11, color: "rgba(251,241,239,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pasarela segura</div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, fontSize: 13, color: "rgba(251,241,239,0.5)" }}>
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
