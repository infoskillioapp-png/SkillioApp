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
    <div
      className="rounded-xl border p-3.5 max-w-sm"
      style={{ borderColor: "var(--danger)", background: "var(--accent-soft)" }}
    >
      <p className="mb-3 text-[12.5px] text-ink">
        ¿Confirmás? Si cancelás podés seguir usando PRO hasta que termine el período de facturación.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={step === "loading"}
          className="flex-1 rounded-lg py-2 text-[12.5px] font-bold text-[#FBF1EF] transition active:translate-y-[1px] disabled:opacity-50"
          style={{ background: "var(--danger)" }}
        >
          {step === "loading" ? "Cancelando…" : "Sí, cancelar"}
        </button>
        <button
          onClick={() => setStep("idle")}
          className="flex-1 rounded-lg border border-rule py-2 text-[12.5px] font-semibold text-ink transition hover:bg-paper-warm"
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
