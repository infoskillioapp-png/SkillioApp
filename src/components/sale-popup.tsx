"use client";

import { useEffect, useState } from "react";
import { track, pixel } from "@/lib/track-client";

// Valor (ARS) por plan, para los eventos de Meta.
const PLAN_VALUE: Record<string, number> = { semanal: 4900, pro: 15900, mensual: 15900, trimestral: 34900 };

export type PaywallCtx = "flashcard" | "simulacro" | "resumen" | "generic";
export type PlanPreference = "semanal" | "mensual" | "trimestral" | null;

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

type Props = { ctx: PaywallCtx; onClose: () => void; preferredPlan?: PlanPreference };

export function SalePopup({ ctx, onClose, preferredPlan }: Props) {
  const [loading, setLoading] = useState<"semanal" | "pro" | "trimestral" | null>(null);
  const msg = CTX[ctx];

  async function subscribe(plan: "semanal" | "pro" | "trimestral") {
    setLoading(plan);
    // Funnel + Meta: el usuario eligió un plan en el paywall (alta intención)
    track("paywall_plan_click", plan);
    pixel("InitiateCheckout", { value: PLAN_VALUE[plan] ?? 0, currency: "ARS", content_name: `Plan ${plan}` });
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

  // Funnel + Meta: se mostró el paywall (señal de intermediación de compra)
  useEffect(() => {
    track("paywall_visto", ctx);
    pixel("ViewContent", { content_name: `Paywall ${ctx}`, content_category: "paywall", currency: "ARS" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el usuario vino con un plan preferido desde la landing, auto-dispara al montar
  useEffect(() => {
    if (!preferredPlan) return;
    const mp = preferredPlan === "semanal" ? "semanal" : preferredPlan === "trimestral" ? "trimestral" : "pro";
    subscribe(mp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        position: "relative",
      }}>
        {/* X siempre visible */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            width: 32, height: 32, borderRadius: 999,
            background: "rgba(0,0,0,.45)", border: "none",
            display: "grid", placeItems: "center",
            cursor: "pointer", backdropFilter: "blur(4px)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {/* imagen con altura máxima para mobile */}
        <div style={{ maxHeight: "min(48vw, 280px)", overflow: "hidden" }}>
          <img src={msg.image} alt="" style={{ width: "100%", display: "block" }} />
        </div>

        {/* contenido */}
        <div style={{ padding: "16px 18px 20px" }}>

          {/* feature list */}
          <div style={{
            background: "linear-gradient(135deg,#f5f3ff,#eef2ff)",
            borderRadius: 16, padding: "11px 14px", marginBottom: 14,
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

          {/* plan Trimestral — mayor ahorro */}
          <button
            onClick={() => subscribe("trimestral")}
            disabled={!!loading}
            style={{
              width: "100%",
              background: loading === "trimestral"
                ? "linear-gradient(135deg,#9333ea,#db2777)"
                : "linear-gradient(135deg,#c026d3,#db2777,#f43f5e)",
              border: "none", borderRadius: 20,
              padding: "14px 20px",
              cursor: loading ? "not-allowed" : "pointer",
              textAlign: "left",
              marginBottom: 10,
              boxShadow: "0 6px 20px rgba(192,38,211,.38)",
              transition: "transform .15s, box-shadow .15s",
              opacity: loading && loading !== "trimestral" ? 0.5 : 1,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 28px rgba(192,38,211,.48)"; } }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 6px 20px rgba(192,38,211,.38)"; }}
          >
            <div>
              <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 15, color: "#fff" }}>
                Trimestral · Ahorras $12.800
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.78)", marginTop: 2 }}>90 días · el mayor valor</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 900, fontSize: 22, color: "#fff", lineHeight: 1 }}>
                {loading === "trimestral" ? "…" : "$34.900"}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>/ trimestre</div>
            </div>
          </button>

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

          {/* close link */}
          <div style={{ textAlign: "center" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 12, color: "var(--muted)", cursor: "pointer", opacity: 0.55 }}>
              Quizás después
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
