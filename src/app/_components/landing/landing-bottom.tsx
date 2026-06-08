"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrow, IconCheck, IconX, IconHeart, SkillioMark } from "./landing-top";
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
// PRICING
// ============================================================
export function Pricing({ onCTA }: { onCTA: () => void }) {
  const router = useRouter();
  const plans = [
    {
      name: "PRO",
      sub: "Para aprobar bien con ayuda de IA",
      price: "$16.000",
      period: "/ mes",
      cta: "Empezá gratis",
      ctaStyle: "btn-primary",
      planKey: "pro",
      featured: true,
      perks: [
        { ok: true, t: "500 créditos mensuales de IA" },
        { ok: true, t: "Resúmenes y procesamiento prioritario" },
        { ok: true, t: "Simulacros de parciales ilimitados" },
        { ok: true, t: "Flashcards inteligentes + repetición espaciada" },
        { ok: true, t: "Modelos avanzados de IA" },
        { ok: true, t: "Subir a Comunidad y ganar XP" },
        { ok: true, t: "Pomodoro, agenda y logros" },
      ],
    },
  ];
  return (
    <section id="planes" className="section">
      <div className="container-x">
        <SectionHeader
          eyebrow="Planes"
          title={<>Simple, claro, sin <span className="gradient-text">letra chica</span></>}
          sub="Entrá gratis y probá la IA. Cuando quieras más, pasás a PRO."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, marginTop: 42, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
          {plans.map((p, i) => (
            <div key={i} style={{ background: p.featured ? "var(--accent)" : "var(--paper)", color: p.featured ? "#ffffff" : "var(--ink)", borderRadius: 24, padding: 32, border: p.featured ? "1.5px solid var(--accent)" : "1px solid rgba(53,56,49,0.08)", position: "relative", boxShadow: p.featured ? "0 20px 40px -20px rgba(165,64,45,0.45)" : "0 1px 0 rgba(53,56,49,0.04)" }}>
              {p.featured && (
                <span style={{ position: "absolute", top: -12, right: 24, padding: "5px 12px", borderRadius: 999, background: "var(--ink)", color: "white", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>⭐ MÁS ELEGIDO</span>
              )}
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 32, letterSpacing: "-0.02em", lineHeight: 1 }}>{p.name}</div>
              <div style={{ marginTop: 6, fontSize: 14, opacity: p.featured ? 0.7 : 1, color: p.featured ? undefined : "var(--ink-soft)" }}>{p.sub}</div>
              <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 54, letterSpacing: "-0.025em", lineHeight: 1 }}>{p.price}</span>
                <span style={{ fontSize: 14, opacity: 0.7 }}>{p.period}</span>
              </div>
              <button className={"btn " + p.ctaStyle} style={{ width: "100%", marginTop: 20, ...(p.featured ? { background: "white", color: "var(--accent)" } : { background: "var(--paper-warm)", color: "var(--ink)" }) }} onClick={() => router.push("/registro")}>
                {p.cta}
              </button>
              <div style={{ height: 1, background: p.featured ? "rgba(255,255,255,0.25)" : "rgba(53,56,49,0.08)", margin: "24px 0" }} />
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {p.perks.map((pk, j) => (
                  <li key={j} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 }}>
                    <span style={{ width: 20, height: 20, borderRadius: 999, background: pk.ok ? (p.featured ? "rgba(255,255,255,0.25)" : "rgba(165,64,45,0.12)") : "var(--bg-2)", color: pk.ok ? (p.featured ? "white" : "var(--accent)") : "var(--ink-softer)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                      {pk.ok ? <IconCheck size={12} stroke={2.5} /> : <IconX size={12} stroke={2.5} />}
                    </span>
                    <span style={{ opacity: pk.ok ? 1 : 0.55 }}>{pk.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: 22, fontSize: 13, color: "var(--ink-softer)" }}>
          Cancelás cuando quieras · Pagos seguros con Mercado Pago
        </p>
      </div>
    </section>
  );
}

// ============================================================
// FAQ
// ============================================================
export function FAQ() {
  const items = [
    { q: "¿Cómo funciona la prueba gratis de 24 horas?", a: "Al registrarte tenés acceso completo a PRO por 24 horas. Si no te enamoraste, cancelás cuando quieras. Nada de cobros sorpresa." },
    { q: "¿Mis apuntes y datos son seguros?", a: "Sí. Tus apuntes son privados por default. Nadie ve nada salvo que vos decidas compartirlo en la Comunidad. Usamos cifrado en tránsito y en reposo." },
    { q: "¿Qué tan precisa es la IA?", a: "Muy buena para resumir, generar flashcards y simulacros. Igual: siempre revisá los resultados. La IA es una copilota, no reemplaza estudiar." },
    { q: "¿Puedo subir cualquier formato?", a: "Sí: PDFs, fotos de pizarrón o apuntes, fotos de hojas escritas a mano. Si lo podés leer vos, lo puede leer Skillio." },
    { q: "¿Cómo pago el plan PRO?", a: "A través de MERCADOPAGO con tarjeta de crédito o débito. Te adherís al débito automático y podés cancelar cuando quieras en 2 clicks." },
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
        <h2 className="h-section" style={{ margin: "0 auto", maxWidth: 760 }}>
          Probá Skillio PRO <span className="gradient-text">24 horas gratis</span>.<br />
          Después, vos decidís.
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
          <button className="btn btn-primary btn-lg" onClick={onCTA}>
            Empezá PRO Gratis · 24h <IconArrow size={16} />
          </button>
          <a href="#funciones" className="btn btn-ghost btn-lg">Ver funciones de nuevo</a>
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
