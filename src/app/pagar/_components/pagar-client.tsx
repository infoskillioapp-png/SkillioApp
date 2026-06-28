"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { SkillioMark } from "@/app/_components/landing/landing-top";

const PLANS = {
  trimestral: {
    name: "Trimestral",
    price: "$34.900",
    period: "/ trimestre",
    duration: "90 días · el mayor ahorro",
    badge: "Ahorras $12.800",
    perks: [
      "Todo lo del plan Mensual",
      "Acceso por 90 días corridos desde el pago",
      "Cancelás en cualquier momento",
    ],
  },
  mensual: {
    name: "Mensual",
    price: "$15.900",
    period: "/ mes",
    duration: "30 días de acceso completo",
    badge: null,
    perks: [
      "Resúmenes, flashcards y simulacros ilimitados",
      "Modelo Sonnet (máxima calidad en resúmenes)",
      "Repetición espaciada inteligente",
      "Acceso completo a la comunidad",
      "Pomodoro, agenda y logros",
    ],
  },
  semanal: {
    name: "Semanal",
    price: "$4.900",
    period: "/ semana",
    duration: "7 días · ideal para preparar el parcial",
    badge: null,
    perks: [
      "Resúmenes, flashcards y simulacros completos",
      "Acceso por 7 días corridos desde el pago",
      "Mismo contenido que el plan mensual",
    ],
  },
} as const;

type PlanKey = keyof typeof PLANS;

function getInitialPlan(plan?: string | null): PlanKey {
  if (plan === "trimestral" || plan === "semanal") return plan;
  return "mensual";
}

export function PagarClient({ hasReferral = false, initialPlan }: { hasReferral?: boolean; initialPlan?: string | null }) {
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(getInitialPlan(initialPlan));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = PLANS[selectedPlan];

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan === "mensual" ? "pro" : selectedPlan }),
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
    <div className="fixed inset-0 bg-bg flex items-center justify-center px-4 overflow-y-auto py-8">
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
          <span className="text-xs text-ink-softer">Elegí tu plan</span>
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

        {/* Selector de planes */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {(["trimestral", "mensual", "semanal"] as PlanKey[]).map((key) => {
            const p = PLANS[key];
            const isActive = selectedPlan === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedPlan(key)}
                className="rounded-2xl p-4 text-left transition border-2 relative"
                style={{
                  borderColor: isActive ? "var(--accent)" : "var(--rule)",
                  background: isActive ? "rgba(165,64,45,0.04)" : "var(--paper)",
                }}
              >
                <div className="font-display font-bold text-[15px]" style={{ color: isActive ? "var(--accent)" : "var(--ink)" }}>
                  {p.name}
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="font-display font-extrabold text-xl" style={{ color: isActive ? "var(--accent)" : "var(--ink)" }}>
                    {p.price}
                  </span>
                  <span className="text-xs text-ink-softer">{p.period}</span>
                </div>
                <p className="text-[11px] text-ink-soft mt-1">{p.duration}</p>
                {p.badge && (
                  <span className="inline-block mt-2 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "#FBF1EF" }}>
                    {p.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Detalle del plan seleccionado */}
        <div className="rounded-3xl bg-paper border border-rule-soft p-7 shadow-lg">
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
            {loading
              ? "Redirigiendo a MercadoPago…"
              : `Activar ${current.name} ${current.price} →`}
          </button>

          <p className="text-center text-[11px] text-ink-softer mt-3">
            Ingresás tu tarjeta en MercadoPago · Sin permanencia · Cancelás cuando quieras
          </p>
        </div>

        <p className="text-center text-[11px] text-ink-softer mt-4">
          Al continuar aceptás los{" "}
          <a href="/terminos" className="underline">términos y condiciones</a>.
        </p>

        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-ink-softer">
          <Link href="/" className="underline hover:text-ink transition-colors">
            Volver al inicio
          </Link>
          <span aria-hidden>·</span>
          <SignOutButton redirectUrl="/">
            <button type="button" className="underline hover:text-ink transition-colors">
              Cerrar sesión / usar otra cuenta
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}
