"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

// Cancelar suscripción (movido acá desde el sidebar, lejos de "Cerrar sesión").
export function CancelSubscription() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "loading" | "done">("idle");

  async function handleCancel() {
    setStep("loading");
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      if (!res.ok) throw new Error();
      setStep("done");
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setStep("idle");
    }
  }

  if (step === "done") {
    return <p className="text-[13px] font-semibold text-success">✓ Suscripción cancelada.</p>;
  }

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("confirm")}
        className="text-[13px] text-ink-soft hover:text-red-500 transition"
      >
        Cancelar suscripción
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-3.5 max-w-sm">
      <p className="mb-2.5 text-[12.5px] text-red-700">
        ¿Confirmás? Perdés el acceso PRO al final del período que ya pagaste.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={step === "loading"}
          className="flex-1 rounded-lg border border-red-200 py-1.5 text-[12.5px] font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        >
          {step === "loading" ? "Cancelando…" : "Sí, cancelar"}
        </button>
        <button
          onClick={() => setStep("idle")}
          className="flex-1 rounded-lg border border-rule-soft py-1.5 text-[12.5px] font-semibold text-ink transition hover:bg-paper-warm"
        >
          No, volver
        </button>
      </div>
    </div>
  );
}

export function SignOut() {
  return (
    <SignOutButton>
      <button className="flex items-center gap-2 text-[13px] text-ink-soft hover:text-ink transition">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-4 w-4 shrink-0">
          <path d="M15 4h4v16h-4M3 12h12m-3-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Cerrar sesión
      </button>
    </SignOutButton>
  );
}
