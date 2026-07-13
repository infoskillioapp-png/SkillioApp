"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillioMark } from "@/app/_components/landing/landing-top";

const MAX_ATTEMPTS = 15; // 15 × 2s = 30s máximo de polling
const POLL_INTERVAL = 2000;

// Flujo de pago para usuarios YA logueados (upgrade desde /app). Confirma la
// suscripción, espera a que el plan quede activo (con polling de respaldo), y
// antes de entrar pide el teléfono (obligatorio) — mismo criterio que el
// embudo anónimo, para poder contactar a quien paga aunque no conteste el mail.
export function ClerkUpgradeClient({ preapprovalId }: { preapprovalId: string | null }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [step, setStep] = useState<"activating" | "phone">("activating");
  const [phone, setPhone] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneErr, setPhoneErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    async function activateViaConfirm(): Promise<boolean> {
      if (!preapprovalId) return false;
      try {
        const res = await fetch("/api/subscription/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preapproval_id: preapprovalId }),
        });
        if (res.ok) {
          const data = await res.json();
          fireStartTrial(data.plan ?? "pro", preapprovalId);
        }
        return res.ok;
      } catch {
        return false;
      }
    }

    // Activación = inicio del trial (la plata real entra 24h después y la
    // reporta el servidor por CAPI como Purchase). Acá marcamos StartTrial para
    // no contar dos veces la misma conversión.
    function fireStartTrial(plan: string, preapproval: string | null) {
      const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
      if (!fbq) return;
      const value = plan === "semanal" ? 4900 : plan === "trimestral" ? 34900 : 15900;
      fbq(
        "track",
        "StartTrial",
        { value, currency: "ARS", content_name: `Plan ${plan.toUpperCase()} Skillio` },
        preapproval ? { eventID: `starttrial_${preapproval}` } : undefined,
      );
    }

    async function checkPlan(): Promise<boolean> {
      try {
        const res = await fetch("/api/me/plan");
        const data = await res.json();
        return data.plan && data.plan !== "free";
      } catch {
        return false;
      }
    }

    async function run() {
      const confirmed = await activateViaConfirm();
      if (cancelled) return;
      if (confirmed) {
        setStep("phone");
        return;
      }

      const loop = async () => {
        if (cancelled) return;
        const active = await checkPlan();
        if (cancelled) return;
        if (active) {
          setStep("phone");
          return;
        }
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          setFailed(true);
        } else {
          setTimeout(loop, POLL_INTERVAL);
        }
      };
      setTimeout(loop, POLL_INTERVAL);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, preapprovalId]);

  async function savePhone() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setPhoneErr("Ingresá un teléfono válido.");
      return;
    }
    setPhoneBusy(true);
    setPhoneErr("");
    try {
      const res = await fetch("/api/me/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        setPhoneErr("No pudimos guardar el teléfono. Probá de nuevo.");
        setPhoneBusy(false);
        return;
      }
    } catch {
      setPhoneErr("Algo salió mal. Probá de nuevo.");
      setPhoneBusy(false);
      return;
    }
    router.replace("/app?upgraded=1");
  }

  if (step === "phone") {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-6 px-6 text-center">
        <SkillioMark size={30} />
        <div style={{ width: "min(380px, 100%)" }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
          <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-ink mb-2">
            ¡Plan activado!
          </h1>
          <p className="text-sm text-ink-soft mb-5">
            Última cosa: dejanos tu teléfono para poder contactarte si lo necesitás.
          </p>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="11 2345 6789"
            value={phone}
            disabled={phoneBusy}
            onChange={(e) => {
              setPhone(e.target.value);
              if (phoneErr) setPhoneErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && savePhone()}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "14px 15px",
              fontSize: 15,
              borderRadius: 13,
              border: `1.5px solid ${phoneErr ? "#ff5b71" : "rgba(139,92,246,.28)"}`,
              outline: "none",
              marginBottom: phoneErr ? 8 : 14,
            }}
          />
          {phoneErr && (
            <div style={{ fontSize: 13, color: "#d63a52", fontWeight: 600, marginBottom: 14, textAlign: "left" }}>
              {phoneErr}
            </div>
          )}
          <button
            onClick={savePhone}
            disabled={phoneBusy}
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: 14,
              background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
              color: "#fff",
              fontFamily: "var(--po)",
              fontWeight: 700,
              fontSize: 15.5,
              cursor: phoneBusy ? "default" : "pointer",
              boxShadow: "0 8px 22px rgba(124,58,237,.28)",
              opacity: phoneBusy ? 0.75 : 1,
            }}
          >
            {phoneBusy ? "Guardando…" : "Guardar y entrar →"}
          </button>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <SkillioMark size={28} />
        <h1 className="font-display font-bold text-2xl mt-6 text-ink">Tu pago fue recibido</h1>
        <p className="text-sm text-ink-soft max-w-sm">
          El procesamiento está tardando más de lo esperado. Tu cuenta se activará en minutos. Si no
          se activa, escribinos a soporte.
        </p>
        <button
          onClick={() => router.replace("/app")}
          className="mt-4 px-6 py-2.5 rounded-full font-display font-semibold text-sm"
          style={{ background: "var(--accent)", color: "#FBF1EF" }}
        >
          Ir al dashboard igual →
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
      </div>

      <div className="relative">
        <SkillioMark size={32} />
      </div>

      <div className="w-14 h-14 rounded-full border-4 border-rule animate-spin" style={{ borderTopColor: "var(--accent)" }} />

      <div>
        <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-ink mb-2">¡Pago recibido!</h1>
        <p className="text-sm text-ink-soft">Activando tu cuenta… esto tarda unos segundos.</p>
      </div>
    </div>
  );
}
