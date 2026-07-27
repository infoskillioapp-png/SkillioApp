"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { SkillioMark } from "@/app/_components/landing/landing-top";

// El Brick de MP es 100% cliente (usa window). Lo cargamos con ssr:false para
// que no intente renderizar en el server.
const EmbeddedCheckout = dynamic(
  () => import("./embedded-checkout").then((m) => m.EmbeddedCheckout),
  { ssr: false, loading: () => <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>Cargando el pago seguro…</div> },
);

const FEATURES = [
  "Resúmenes, tarjetas y simulacros ilimitados",
  "Modelo de máxima calidad en resúmenes",
  "Acceso completo sin cortes a todos tus apuntes",
];

export function PagarEmbeddedClient({ initialEmail = "" }: { initialEmail?: string }) {
  return (
    <div className="fixed inset-0 bg-bg flex items-start justify-center px-4 overflow-y-auto py-8">
      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <SkillioMark size={28} />
          <Link href="/app" className="text-xs text-ink-softer underline">Volver</Link>
        </div>

        {/* Resumen del plan */}
        <div style={{ background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", borderRadius: 20, padding: "18px 20px", color: "#fff", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 18 }}>Mensual PRO</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 900, fontSize: 24, lineHeight: 1 }}>$15.900</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)" }}>/ mes</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {FEATURES.map((f) => (
              <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(255,255,255,.92)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Checkout embebido */}
        <div className="rounded-3xl bg-paper border border-rule-soft p-5 shadow-lg">
          <EmbeddedCheckout initialEmail={initialEmail} />
        </div>

        <p className="text-center text-[11px] text-ink-softer mt-4">
          Al continuar aceptás los <a href="/terminos" className="underline">términos y condiciones</a>.
        </p>
      </div>
    </div>
  );
}
