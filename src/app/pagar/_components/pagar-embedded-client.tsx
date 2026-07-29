"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SkillioMark } from "@/app/_components/landing/landing-top";

// El Brick de MP es 100% cliente (usa window). Lo cargamos con ssr:false para
// que no intente renderizar en el server.
const EmbeddedCheckout = dynamic(
  () => import("./embedded-checkout").then((m) => m.EmbeddedCheckout),
  { ssr: false, loading: () => <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b", fontSize: 13 }}>Cargando el pago seguro…</div> },
);

const FEATURES = [
  "Resumen, tarjetas, simulacros y juegos con tu propio apunte",
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

        {/* Encabezado estilo hero de la home (gradiente + Booki flotando) */}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            padding: "20px 22px",
            color: "#fff",
            marginBottom: 16,
            background:
              "radial-gradient(120% 140% at 85% 0%, #8b5cf6 0%, #7c3aed 45%, #4f7dff 100%)",
            boxShadow: "0 18px 44px rgba(124,58,237,.34)",
          }}
        >
          {/* glow decorativo */}
          <span style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,#c084fc,transparent 70%)", opacity: .55, filter: "blur(24px)", pointerEvents: "none" }} />

          {/* Booki flotando */}
          <Image
            src="/booki-3.png"
            alt="Booki"
            width={104}
            height={104}
            style={{
              position: "absolute",
              right: 12,
              top: 14,
              width: 92,
              height: 92,
              objectFit: "contain",
              filter: "drop-shadow(0 6px 18px rgba(124,58,237,.6))",
              animation: "bookiFloat 4.4s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", maxWidth: "72%" }}>
            <div style={{ display: "inline-flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 19 }}>Mensual PRO</span>
              <span style={{ fontFamily: "var(--po)", fontWeight: 900, fontSize: 22, lineHeight: 1 }}>$15.900</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.8)" }}>/ mes</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {FEATURES.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, lineHeight: 1.35, color: "rgba(255,255,255,.94)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6 9 17l-5-5" /></svg>
                  {f}
                </div>
              ))}
            </div>

            {/* claim de cierre */}
            <div style={{ marginTop: 12, fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 15 }}>✨</span> Aprobá más fácil y divertite estudiando
            </div>
          </div>
        </div>

        {/* Checkout embebido */}
        <div className="rounded-3xl bg-paper border border-rule-soft p-5 shadow-lg">
          <EmbeddedCheckout initialEmail={initialEmail} />
        </div>

        {/* Transparencia del cobro recurrente (confianza + menos contracargos) */}
        <p className="text-center text-[11px] text-ink-softer mt-4">
          Se renueva automáticamente cada mes. Cancelás cuando quieras, sin permanencia.
          <br />
          Al continuar aceptás los <a href="/terminos" className="underline">términos y condiciones</a>.
        </p>
      </div>
    </div>
  );
}
