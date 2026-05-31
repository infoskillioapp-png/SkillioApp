"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SkillioMark } from "@/app/_components/landing/landing-top";

const MAX_ATTEMPTS = 20; // 20 intentos × 2s = 40s máximo
const POLL_INTERVAL = 2000;

export default function PagoExitosoPage() {
  const router = useRouter();
  const [attempts, setAttempts] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function checkPlan() {
      try {
        const res = await fetch("/api/me/plan");
        const data = await res.json();

        if (data.plan && data.plan !== "free") {
          router.replace("/app?upgraded=1");
          return;
        }
      } catch {
        // ignorar errores de red, seguir reintentando
      }

      setAttempts((a) => {
        const next = a + 1;
        if (next >= MAX_ATTEMPTS) {
          setFailed(true);
        } else {
          timer = setTimeout(checkPlan, POLL_INTERVAL);
        }
        return next;
      });
    }

    timer = setTimeout(checkPlan, POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [router]);

  if (failed) {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <SkillioMark size={28} />
        <h1 className="font-display font-bold text-2xl mt-6 text-ink">
          Tu pago fue recibido
        </h1>
        <p className="text-sm text-ink-soft max-w-sm">
          El procesamiento está tardando más de lo esperado. Tu cuenta se activará en minutos.
          Si no se activa, escribinos a soporte.
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
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
      </div>

      <div className="relative">
        <SkillioMark size={32} />
      </div>

      {/* Spinner */}
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
