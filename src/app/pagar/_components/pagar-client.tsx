"use client";

import { useState } from "react";
import { SkillioMark } from "@/app/_components/landing/landing-top";

const PLANS = {
  pro: {
    name: "PRO",
    price: "$16.000",
    period: "/ mes",
    credits: 500,
    perks: [
      "500 créditos mensuales de IA",
      "Resúmenes y procesamiento prioritario",
      "Simulacros de parciales ilimitados",
      "Flashcards inteligentes + repetición espaciada",
      "Acceso completo a la comunidad",
      "Pomodoro, agenda y logros",
    ],
  },
  basico: {
    name: "Básico",
    price: "$10.000",
    period: "/ mes",
    credits: 30,
    perks: [
      "30 créditos mensuales de IA",
      "Resúmenes de apuntes y PDFs",
      "1 simulacro de parcial",
      "Acceso a la comunidad",
      "Pomodoro, agenda y logros",
    ],
  },
} as const;

export function PagarClient({ plan, hasReferral = false }: { plan: "pro" | "basico"; hasReferral?: boolean }) {
  const [selected, setSelected] = useState<"pro" | "basico">(plan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = PLANS[selected];

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al conectar con MercadoPago.");
        setLoading(false);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      setError("No se pudo conectar con el servidor. Intentá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center px-4">
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, rgba(74,107,138,0.4), transparent 65%)" }}
        />
      </div>

      <div className="relative w-full max-w-lg animate-skillio-fade-in">
        <div className="flex items-center justify-between mb-8">
          <SkillioMark size={28} />
          <span className="text-xs text-ink-softer">Paso final · Elegí tu plan</span>
        </div>

        {/* Badge de referido */}
        {hasReferral && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: "rgba(165,64,45,0.06)", borderColor: "var(--accent)" }}>
            <span className="text-xl">🎁</span>
            <p className="text-sm text-ink">
              <strong className="text-accent">+50 créditos de regalo</strong> — un amigo te invitó. Se acreditarán cuando se efectúe tu primer pago.
            </p>
          </div>
        )}

        {/* Selector de plan */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {(["pro", "basico"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelected(p)}
              className="rounded-2xl border-2 p-4 text-left transition-all"
              style={{
                borderColor: selected === p ? "var(--accent)" : "var(--rule)",
                background: selected === p ? "rgba(165,64,45,0.06)" : "var(--paper)",
              }}
            >
              <div className="font-display font-bold text-lg" style={{ color: selected === p ? "var(--accent)" : "var(--ink)" }}>
                {PLANS[p].name}
              </div>
              <div className="text-sm font-semibold mt-0.5" style={{ color: "var(--ink)" }}>
                {PLANS[p].price}
                <span className="font-normal text-xs ml-1 opacity-60">{PLANS[p].period}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detalle del plan seleccionado */}
        <div className="rounded-3xl bg-paper border border-rule-soft p-7 shadow-lg">
          <div className="flex items-baseline gap-2 mb-5">
            <span className="font-display font-extrabold text-3xl tracking-tight" style={{ color: "var(--accent)" }}>
              {current.price}
            </span>
            <span className="text-sm text-ink-soft">{current.period}</span>
            <span className="ml-auto text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(165,64,45,0.10)", color: "var(--accent)" }}>
              24h gratis
            </span>
          </div>

          <ul className="flex flex-col gap-2.5 mb-6">
            {current.perks.map((perk, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-ink">
                <span className="w-4 h-4 rounded-full flex-shrink-0 grid place-items-center" style={{ background: "rgba(165,64,45,0.12)", color: "var(--accent)" }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-3.5 rounded-full font-display font-bold text-sm transition active:translate-y-[1px] disabled:opacity-60"
            style={{
              background: "var(--accent)",
              color: "#FBF1EF",
              boxShadow: "0 8px 24px var(--accent-glow)",
            }}
          >
            {loading ? "Redirigiendo a MercadoPago…" : `Empezar con ${current.name} · 24h gratis`}
          </button>

          <p className="text-center text-[11px] text-ink-softer mt-3">
            Ingresás tu tarjeta en MercadoPago · Cancelás cuando quieras
          </p>
        </div>

        <p className="text-center text-[11px] text-ink-softer mt-4">
          Al continuar aceptás los{" "}
          <a href="#" className="underline">términos y condiciones</a>.
        </p>
      </div>
    </div>
  );
}
