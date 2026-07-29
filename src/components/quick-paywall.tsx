"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track, pixel } from "@/lib/track-client";

// Paywall COMPACTO (sin imagen, 2 botones grandes) para el momento de máxima
// atención: apenas termina de generar el material. La idea no es forzar el pago
// sino avisar que hay PRO y el precio, dejando MUY visible "Seguir gratis".
export function QuickPaywall({ onClose, ctx = "generic" }: { onClose: () => void; ctx?: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    track("paywall_visto", ctx);
    pixel("ViewContent", { content_name: `Paywall ${ctx}`, content_category: "paywall", currency: "ARS" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checkout EMBEBIDO: navegación interna a /pagar (Mensual PRO), sin salir de
  // Skillio ni redirigir a MercadoPago.
  function subscribe() {
    setLoading(true);
    track("paywall_plan_click", "pro");
    pixel("InitiateCheckout", { value: 15900, currency: "ARS", content_name: "Plan PRO Mensual" });
    router.push("/pagar");
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,8,28,.78)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        overflowY: "auto",
        padding: "16px 16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 26,
          width: "min(400px, 100%)",
          margin: "auto",
          padding: "26px 22px 22px",
          boxShadow: "0 32px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(139,92,246,.12)",
          animation: "fadeUp .26s cubic-bezier(.22,1,.36,1) both",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
        <h3 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 20, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.25 }}>
          ¡Tu material está listo!
        </h3>
        <p style={{ fontSize: 14.5, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 22px" }}>
          Con <b style={{ color: "var(--ink)" }}>PRO</b> desbloqueás los resúmenes, tarjetas y simulacros <b style={{ color: "var(--ink)" }}>completos</b> e ilimitados. Podés seguir viendo la muestra gratis igual.
        </p>

        {/* Botón 1: Mensual PRO */}
        <button
          onClick={subscribe}
          disabled={loading}
          style={{
            width: "100%",
            padding: "15px 18px",
            border: "none",
            borderRadius: 16,
            background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
            color: "#fff",
            cursor: loading ? "default" : "pointer",
            boxShadow: "0 10px 26px rgba(124,58,237,.35)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            opacity: loading ? 0.75 : 1,
          }}
        >
          <span style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 16 }}>
            {loading ? "Abriendo checkout…" : "⚡ Empezar con Mensual PRO"}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.9 }}>$15.900 / mes · cancelás cuando quieras</span>
        </button>

        {/* Botón 2: Seguir gratis (bien visible) */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: 11,
            padding: "15px 18px",
            border: "1.5px solid rgba(31,35,71,.14)",
            borderRadius: 16,
            background: "#f5f4fb",
            color: "var(--ink)",
            fontFamily: "var(--po)", fontWeight: 700, fontSize: 15.5,
            cursor: "pointer",
          }}
        >
          Seguir gratis
        </button>
      </div>
    </div>
  );
}
