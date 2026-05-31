"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SkillioMark } from "@/app/_components/landing/landing-top";

const MAX_ATTEMPTS = 15; // 15 × 2s = 30s máximo de polling
const POLL_INTERVAL = 2000;

function PagoExitosoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    // MercadoPago redirige con ?preapproval_id= al volver de la suscripción.
    const preapprovalId =
      params.get("preapproval_id") ?? params.get("preapproval_plan_id");

    async function activateViaConfirm(): Promise<boolean> {
      if (!preapprovalId) return false;
      try {
        const res = await fetch("/api/subscription/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preapproval_id: preapprovalId }),
        });
        return res.ok;
      } catch {
        return false;
      }
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
      // 1) Intento directo de confirmación con el preapproval_id
      const confirmed = await activateViaConfirm();
      if (cancelled) return;
      if (confirmed) {
        router.replace("/app?upgraded=1");
        return;
      }

      // 2) Fallback: polling al estado del plan (por si confirmó vía webhook)
      const loop = async () => {
        if (cancelled) return;
        const active = await checkPlan();
        if (cancelled) return;
        if (active) {
          router.replace("/app?upgraded=1");
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
  }, [router, params]);

  if (failed) {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <SkillioMark size={28} />
        <h1 className="font-display font-bold text-2xl mt-6 text-ink">
          Tu pago fue recibido
        </h1>
        <p className="text-sm text-ink-soft max-w-sm">
          El procesamiento está tardando más de lo esperado. Tu cuenta se activará en
          minutos. Si no se activa, escribinos a soporte.
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

      <div
        className="w-14 h-14 rounded-full border-4 border-rule animate-spin"
        style={{ borderTopColor: "var(--accent)" }}
      />

      <div>
        <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-ink mb-2">
          ¡Pago recibido!
        </h1>
        <p className="text-sm text-ink-soft">
          Activando tu cuenta… esto tarda unos segundos.
        </p>
      </div>
    </div>
  );
}

export default function PagoExitosoPage() {
  return (
    <Suspense>
      <PagoExitosoInner />
    </Suspense>
  );
}
