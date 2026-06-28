"use client";

import { useState } from "react";
import Image from "next/image";

export type PaywallCtx = "flashcard" | "simulacro" | "resumen" | "generic";

const CTX: Record<PaywallCtx, { image: string; title: string; sub: string }> = {
  flashcard: {
    image: "/paywalls/flashcard.jpeg",
    title: "Hay más tarjetas para dominar",
    sub: "Desbloqueá el mazo completo y aprendé cada concepto con repetición espaciada.",
  },
  simulacro: {
    image: "/paywalls/simulacro.jpeg",
    title: "Hay más preguntas en el simulacro",
    sub: "Completá el examen completo para detectar todas tus lagunas antes del parcial.",
  },
  resumen: {
    image: "/paywalls/resumen.jpeg",
    title: "Hay más puntos clave en el resumen",
    sub: "Accedé al resumen completo y dominá cada tema de tu apunte.",
  },
  generic: {
    image: "/paywalls/generic.jpeg",
    title: "Estudiá sin límites",
    sub: "Pasate a PRO y accedé a todo el contenido generado por Booki.",
  },
};

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
        background: "rgba(15,13,34,.72)",
        backdropFilter: "blur(7px)",
        zIndex: 100,
        display: "grid", placeItems: "center",
        padding: 20,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 28,
        boxShadow: "0 28px 70px rgba(0,0,0,.24)",
        width: "min(440px,96vw)",
        overflow: "hidden",
        animation: "fadeUp .3s both",
      }}>
        {/* imagen contextual */}
        <div style={{ position: "relative", width: "100%", height: 200, background: "linear-gradient(135deg,#f0edff,#e8eeff)" }}>
          <Image
            src={msg.image}
            alt=""
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>

        {/* contenido */}
        <div style={{ padding: "22px 24px 26px" }}>
          {/* header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <h2 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 20, color: "var(--ink)", marginBottom: 7, lineHeight: 1.25 }}>
              {msg.title}
            </h2>
            <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, maxWidth: "34ch", margin: "0 auto" }}>
              {msg.sub}
            </p>
          </div>

        {/* planes */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 14 }}>
          {/* semanal */}
          <button
            onClick={() => subscribe("semanal")}
            disabled={!!loading}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "#f7f8fd",
              border: "2px solid rgba(79,125,255,.22)",
              borderRadius: 18, padding: "14px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              textAlign: "left", transition: ".18s",
              opacity: loading && loading !== "semanal" ? 0.45 : 1,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#4f7dff,#6a5bff)", display: "grid", placeItems: "center", fontSize: 22 }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Semanal</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Ideal para el parcial de esta semana.</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 18, color: "#4f7dff" }}>
                {loading === "semanal" ? "…" : "$4.900"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>/ semana</div>
            </div>
          </button>

          {/* mensual */}
          <button
            onClick={() => subscribe("pro")}
            disabled={!!loading}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              background: "linear-gradient(135deg,rgba(139,92,246,.06),rgba(99,38,210,.08))",
              border: "2px solid rgba(139,92,246,.35)",
              borderRadius: 18, padding: "14px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              textAlign: "left", transition: ".18s",
              position: "relative",
              opacity: loading && loading !== "pro" ? 0.45 : 1,
            }}
          >
            <span style={{
              position: "absolute", top: -11, right: 16,
              background: "linear-gradient(135deg,#8b5cf6,#6d3bf2)",
              color: "#fff", fontSize: 10, fontWeight: 700,
              borderRadius: 999, padding: "3px 10px",
            }}>
              ⭐ Más popular
            </span>
            <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: "linear-gradient(135deg,#8b5cf6,#6d3bf2)", display: "grid", placeItems: "center", fontSize: 22 }}>🌟</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>Mensual PRO</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Mejor valor. Todo un mes sin límites.</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 18, color: "#8b5cf6" }}>
                {loading === "pro" ? "…" : "$15.900"}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>/ mes</div>
            </div>
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "11px",
            borderRadius: 13, background: "#f3f4fb",
            border: "none", fontSize: 13.5,
            fontWeight: 600, color: "var(--muted)",
            cursor: "pointer",
          }}
        >
          Quizás después
        </button>
        </div>{/* fin contenido */}
      </div>
    </div>
  );
}
