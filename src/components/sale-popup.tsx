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

export type SaleContext = "flashcard" | "simulacro" | "resumen" | "generic";

type SaleCtx = {
  open: (ctx?: SaleContext) => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = createContext<SaleCtx | null>(null);

export function useSalePopup() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSalePopup debe usarse dentro de <SalePopupProvider>");
  return c;
}

export function SalePopupProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [saleCtx, setSaleCtx] = useState<SaleContext>("generic");

  const open = useCallback((ctx: SaleContext = "generic") => {
    setSaleCtx(ctx);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<SaleCtx>(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <SaleModal onClose={close} ctx={saleCtx} />}
    </Ctx.Provider>
  );
}

// Copy de urgencia según desde dónde se dispara el popup
const COPY: Record<SaleContext, { headline: string; sub: string }> = {
  flashcard: {
    headline: "Hay más tarjetas esperándote.",
    sub: "Desbloqueá el mazo completo y estudiá con repetición espaciada.",
  },
  simulacro: {
    headline: "El examen tiene más preguntas.",
    sub: "Accedé al simulacro completo para llegar más preparado al parcial.",
  },
  resumen: {
    headline: "Este resumen tiene más secciones.",
    sub: "Desbloqueá el contenido completo para repasar sin límites.",
  },
  generic: {
    headline: "Studiá sin límites. Aprobá más fácil.",
    sub: "Desbloqueá resúmenes, flashcards y simulacros completos.",
  },
};

function SaleModal({ onClose, ctx }: { onClose: () => void; ctx: SaleContext }) {
  const toast = useToast();
  const [loading, setLoading] = useState<"semanal" | "mensual" | null>(null);

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
        toast.error("Error", data.error ?? "No se pudo iniciar el pago.");
        setLoading(null);
        return;
      }
      window.location.href = data.init_point;
    } catch {
      toast.error("Error", "No se pudo conectar con el servidor.");
      setLoading(null);
    }
  }

  const copy = COPY[ctx];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ animation: "skillio-fade-in .2s ease both" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-paper border border-rule shadow-2xl overflow-hidden"
        style={{ animation: "skillio-modal-pop .38s cubic-bezier(.34,1.56,.64,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Halo decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[360px] h-[200px] rounded-full blur-3xl opacity-40"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 60%)" }}
        />

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-paper-warm text-ink-soft hover:text-ink transition flex items-center justify-center z-10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative px-6 pt-8 pb-7">
          {/* Badge */}
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-[#FBF1EF] text-[10px] font-bold tracking-[0.14em]">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 L13 2 Z" />
              </svg>
              DESBLOQUEAR CONTENIDO
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-6">
            <h2 className="font-display font-extrabold text-[22px] tracking-[-0.02em] leading-tight mb-2">
              {copy.headline}
            </h2>
            <p className="text-[13px] text-ink-soft max-w-xs mx-auto leading-snug">
              {copy.sub}
            </p>
          </div>

          {/* Planes */}
          <div className="space-y-3">
            {/* Mensual — destacado */}
            <div className="relative rounded-2xl border-2 border-accent bg-paper-warm p-4">
              <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ink text-paper text-[9px] font-bold tracking-[0.08em]">
                ★ MÁS POPULAR
              </span>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-extrabold text-[15px]">Mensual</p>
                  <p className="text-[11px] text-ink-softer">30 días de acceso completo</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold text-[22px] text-accent num">$15.900</p>
                  <p className="text-[10px] text-ink-softer">/ mes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePlan("mensual")}
                disabled={!!loading}
                className="mt-3 w-full py-2.5 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[13px] shadow-[0_8px_20px_var(--accent-glow)] hover:opacity-90 transition disabled:opacity-60"
              >
                {loading === "mensual" ? "Redirigiendo…" : "Activar Mensual →"}
              </button>
            </div>

            {/* Semanal */}
            <div className="rounded-2xl border border-rule bg-paper p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-bold text-[15px]">Semanal</p>
                  <p className="text-[11px] text-ink-softer">7 días · ideal antes del parcial</p>
                </div>
                <div className="text-right">
                  <p className="font-display font-extrabold text-[22px] num">$4.900</p>
                  <p className="text-[10px] text-ink-softer">/ semana</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handlePlan("semanal")}
                disabled={!!loading}
                className="mt-3 w-full py-2.5 rounded-full border border-rule bg-paper-warm font-display font-bold text-[13px] hover:bg-paper transition disabled:opacity-60"
              >
                {loading === "semanal" ? "Redirigiendo…" : "Activar Semanal →"}
              </button>
            </div>
          </div>

          <p className="text-center text-[10.5px] text-ink-softer mt-4">
            Sin permanencia · Cancelás cuando quieras · Pagos seguros con Mercado Pago
          </p>

          <button
            type="button"
            onClick={onClose}
            className="block mx-auto mt-2 text-[11.5px] text-ink-softer hover:text-ink-soft transition"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
