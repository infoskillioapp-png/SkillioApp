"use client";

import { useState } from "react";

export type PaywallCtx = "flashcard" | "simulacro" | "resumen" | "generic";

const CTX: Record<PaywallCtx, { image: string; title: string; sub: string }> = {
  flashcard: {
    image: "/paywalls/flashcard.jpeg",
    title: "Hay más tarjetas para dominar",
    sub: "Desbloqueá el mazo completo y dominá cada concepto.",
  },
  simulacro: {
    image: "/paywalls/simulacro.jpeg",
    title: "Hay más preguntas en el simulacro",
    sub: "Completá el examen completo para detectar todas tus lagunas.",
  },
  resumen: {
    image: "/paywalls/resumen.jpeg",
    title: "Hay más puntos clave en el resumen",
    sub: "Accedé al resumen completo y dominá cada tema de tu apunte.",
  },
  generic: {
    image: "/paywalls/generic.jpeg",
    title: "Estudiá sin límites con PRO",
    sub: "Todo el contenido generado por Booki, sin restricciones.",
  },
};

const FEATURES = [
  "Resúmenes, tarjetas y simulacros ilimitados",
  "IA que aprende con tu forma de estudiar",
  "Acceso a todos tus apuntes sin cortes",
];

type Props = { ctx: PaywallCtx; onClose: () => void };

export function SalePopup({ ctx, onClose }: Props) {
  const [loading, setLoading] = useState<"semanal" | "pro" | null>(null);
  const msg = CTX[ctx];

  async function subscribe(plan: "semanal" | "pro") {
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.init_point) { window.location.href = data.init_point; return; }
    } catch { /* noop */ }
    setLoading(null);
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,8,28,.80)",
        backdropFilter: "blur(10px)",
        zIndex: 100,
        display: "grid", placeItems: "center",
        padding: "16px 16px 80px",
      }}
    >
      <div style={{
        background: "#fff",
        borderRadius: 28,
        boxShadow: "0 32px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(139,92,246,.12)",
        width: "min(440px, 100%)",
        overflow: "hidden",
        animation: "fadeUp .28s cubic-bezier(.22,1,.36,1) both",
        maxHeight: "90vh",
        overflowY: "auto",
      }}>
        {/* imagen */}
        <img src={msg.image} alt="" style={{ width: "100%", display: "block" }} />

        {/* contenido */}
        <div style={{ padding: "22px 22px 24px" }}>

          {/* feature list */}
          <div style={{
            background: "linear-gradient(135deg,#f5f3ff,#eef2ff)",
            borderRadius: 16, padding: "13px 16px", marginBottom: 18,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 999, flexShrink: 0,
                  background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                  display: "grid", placeItems: "center",
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <span style={{ fontSize: 13, color: "#3b3558", fontWeight: 500, lineHeight: 1.35 }}>{f}</span>
              </div>
            ))}
          </div>

          {/* plan PRO — hero */}
          <button
            onClick={() => subscribe("pro")}
            disabled={!!loading}
            style={{
              width: "100%",
              background: loading === "pro"
                ? "linear-gradient(135deg,#7c3aed,#4338ca)"
                : "linear-gradient(135deg,#8b5cf6,#4f7dff)",
              border: "none", borderRadius: 20,
              padding: "18px 20px",
              cursor: loading ? "not-allowed" : "pointer",
              textAlign: "left",
              position: "relative",
              marginBottom: 10,
              boxShadow: "0 8px 24px rgba(139,92,246,.45)",
              transition: "transform .15s, box-shadow .15s",
              opacity: loading && loading !== "pro" ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 14px 32px rgba(139,92,246,.55)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 8px 24px rgba(139,92,246,.45)"; }}
          >
            <span style={{
              position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              color: "#fff", fontSize: 10.5, fontWeight: 800,
              borderRadius: 999, padding: "3px 12px", whiteSpace: "nowrap",
              letterSpacing: ".04em",
            }}>
              ⭐ MÁS POPULAR
            </span>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 17, color: "#fff", marginBottom: 2 }}>
                  Mensual PRO
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>
                  Mejor valor · ~$530/día
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--po)", fontWeight: 900, fontSize: 24, color: "#fff", lineHeight: 1 }}>
                  {loading === "pro" ? "…" : "$15.900"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>/ mes</div>
              </div>
            </div>
            <div style={{
              marginTop: 12,
              background: "rgba(255,255,255,.18)",
              borderRadius: 12, padding: "9px 14px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, color: "#fff" }}>
                {loading === "pro" ? "Redirigiendo…" : "Empezar con Mensual PRO →"}
              </span>
            </div>
          </button>

          {/* plan Semanal — secundario */}
          <button
            onClick={() => subscribe("semanal")}
            disabled={!!loading}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 14,
              background: "#f8f7ff",
              border: "1.5px solid rgba(139,92,246,.2)",
              borderRadius: 16, padding: "13px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              textAlign: "left",
              marginBottom: 16,
              transition: "border-color .15s, background .15s",
              opacity: loading && loading !== "semanal" ? 0.5 : 1,
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = "rgba(139,92,246,.5)"; e.currentTarget.style.background = "#f3f0ff"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(139,92,246,.2)"; e.currentTarget.style.background = "#f8f7ff"; }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#4f7dff,#6a5bff)",
              display: "grid", placeItems: "center", fontSize: 18,
            }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>Semanal</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>Ideal para el parcial de esta semana</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 17, color: "#4f7dff" }}>
                {loading === "semanal" ? "…" : "$4.900"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>/ semana</div>
            </div>
          </button>

          {/* close link — muy sutil */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none",
                fontSize: 12.5, color: "var(--muted)",
                cursor: "pointer", padding: "4px 8px",
                textDecoration: "underline", textUnderlineOffset: 3,
                opacity: 0.65,
              }}
            >
              Quizás después
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
