"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useToast } from "./toast";

type UpgradeCtx = {
  open: () => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = createContext<UpgradeCtx | null>(null);

export function useUpgradeModal() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUpgradeModal tiene que estar dentro de <UpgradeModalProvider>");
  return c;
}

export function UpgradeModalProvider({
  children,
  offerStartedAt = null,
}: {
  children: React.ReactNode;
  offerStartedAt?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<UpgradeCtx>(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <UpgradeModal onClose={close} offerStartedAt={offerStartedAt} />}
    </Ctx.Provider>
  );
}

function UpgradeModal({
  onClose,
  offerStartedAt,
}: {
  onClose: () => void;
  offerStartedAt: string | null;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState<"semanal" | "mensual" | null>(null);

  // Oferta activa: primeras 12h tras el registro
  const offerActive = useMemo(() => {
    if (!offerStartedAt) return false;
    return Date.now() - new Date(offerStartedAt).getTime() < 12 * 60 * 60 * 1000;
  }, [offerStartedAt]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handlePlan(plan: "semanal" | "mensual") {
    setLoading(plan);
    try {
      const res = await fetch("/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan === "mensual" ? "pro" : "semanal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Error", data.error ?? "No se pudo iniciar el pago. Intentá de nuevo.");
        setLoading(null);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      toast.error("Error", "No se pudo conectar con el servidor.");
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-paper border border-rule shadow-lg"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "skillio-modal-pop .45s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* halo decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[300px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 60%)" }}
        />

        {/* close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-paper-warm text-ink-soft hover:text-ink hover:bg-bg-2 transition flex items-center justify-center z-10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative px-6 pt-9 pb-7 sm:px-8">
          {/* Hero */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-[#FBF1EF] text-[10px] font-bold tracking-[0.14em] mb-4">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 L13 2 Z" />
              </svg>
              SKILLIO PRO
            </div>
            <h2 className="font-display font-extrabold text-[26px] tracking-[-0.03em] leading-tight mb-2">
              Estudiá <span className="italic text-accent">sin límites.</span><br />
              Aprobá <span className="italic text-accent">más fácil.</span>
            </h2>
            <p className="text-[13px] text-ink-soft max-w-sm mx-auto leading-snug">
              Desbloqueá resúmenes, flashcards y simulacros completos. Elegí el plan que se adapta a tu parcial.
            </p>
          </div>

          {/* Banner de oferta */}
          {offerActive && (
            <div className="mb-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-accent text-[#FBF1EF] text-[13px] font-semibold shadow-[0_8px_22px_var(--accent-glow)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2.5M9 2h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Precio de lanzamiento · oferta limitada</span>
            </div>
          )}

          {/* Planes */}
          <div className="space-y-3 mb-5">
            {/* Mensual — destacado */}
            <div className="relative rounded-3xl border-2 border-accent bg-paper-warm p-5 flex flex-col">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-ink text-paper text-[10px] font-bold tracking-[0.08em] whitespace-nowrap">
                ★ MÁS ELEGIDO
              </span>

              <div className="flex items-start justify-between mt-1">
                <div>
                  <h3 className="font-display font-extrabold text-xl tracking-[-0.02em]">Mensual</h3>
                  <p className="text-[11.5px] text-ink-soft">30 días · acceso completo</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold text-3xl tracking-[-0.03em] text-accent num">$15.900</p>
                  <p className="text-[11px] text-ink-softer">/ mes</p>
                </div>
              </div>
              <p className="text-[11.5px] text-ink-softer mt-1">
                Menos que una hamburguesa — contra recursar una materia.
              </p>
              <button
                type="button"
                onClick={() => handlePlan("mensual")}
                disabled={!!loading}
                className="mt-4 w-full px-6 py-3 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[14px] shadow-[0_10px_24px_var(--accent-glow)] hover:opacity-90 transition active:translate-y-[1px] disabled:opacity-60"
              >
                {loading === "mensual" ? "Redirigiendo…" : "Activar Mensual →"}
              </button>
            </div>

            {/* Semanal */}
            <div className="rounded-3xl border border-rule bg-paper p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-extrabold text-xl tracking-[-0.02em]">Semanal</h3>
                  <p className="text-[11.5px] text-ink-soft">7 días · ideal antes del parcial</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold text-3xl tracking-[-0.03em] num">$4.900</p>
                  <p className="text-[11px] text-ink-softer">/ semana</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePlan("semanal")}
                disabled={!!loading}
                className="mt-4 w-full px-6 py-3 rounded-full border border-rule font-display font-bold text-[14px] hover:bg-paper-warm transition disabled:opacity-60"
              >
                {loading === "semanal" ? "Redirigiendo…" : "Activar Semanal →"}
              </button>
            </div>
          </div>

          <p className="text-center text-[11px] text-ink-softer mb-3">
            Sin permanencia · Cancelás cuando quieras · Pagos seguros con Mercado Pago
          </p>

          <button
            type="button"
            onClick={onClose}
            className="block mx-auto text-[12px] text-ink-softer hover:text-ink-soft transition"
          >
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
