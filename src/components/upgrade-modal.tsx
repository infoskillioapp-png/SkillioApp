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

type Feature = { icon: string; title: string; description: string };

const FEATURES: Feature[] = [
  {
    icon: "⚡",
    title: "1.000 créditos de IA",
    description: "Generá resúmenes, flashcards y simulacros con 1.000 créditos mensuales.",
  },
  {
    icon: "🧠",
    title: "Modelos avanzados",
    description: "Acceso al motor más potente de Claude para apuntes complejos.",
  },
  {
    icon: "📚",
    title: "Apuntes ilimitados",
    description: "Subí toda tu carrera. PDFs, imágenes y notas sin restricciones.",
  },
  {
    icon: "🎯",
    title: "Simulacros largos",
    description: "Exámenes de 20+ preguntas con explicaciones detalladas.",
  },
  {
    icon: "🌙",
    title: "Modo enfoque profundo",
    description: "Sesiones de Pomodoro extendidas para estudiar sin interrupciones.",
  },
];

export function UpgradeModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<UpgradeCtx>(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && <UpgradeModal onClose={close} />}
    </Ctx.Provider>
  );
}

function UpgradeModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleActivate() {
    toast.info(
      "Pronto disponible",
      "Estamos terminando la integración con el sistema de pagos. Te avisamos por mail.",
    );
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-paper border border-rule shadow-lg"
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

        <div className="relative px-7 pt-9 pb-7">
          {/* Hero */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent text-[#FBF1EF] text-[10px] font-bold tracking-[0.14em] mb-4">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 L13 2 Z" />
              </svg>
              SKILLIO PRO
            </div>
            <h2 className="font-display font-extrabold text-[28px] tracking-[-0.03em] leading-tight mb-2">
              Estudiá <span className="italic text-accent">sin límites.</span><br />
              Aprobá <span className="italic text-accent">más fácil.</span>
            </h2>
            <p className="text-[13px] text-ink-soft max-w-sm mx-auto leading-snug">
              Desbloqueá toda la potencia de Skillio y convertí cada apunte en
              material listo para rendir.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-paper-warm border border-rule-soft hover:border-rule transition"
              >
                <span className="text-xl shrink-0 leading-none mt-0.5">{f.icon}</span>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[13px] leading-tight mb-0.5">
                    {f.title}
                  </div>
                  <div className="text-[11.5px] text-ink-soft leading-snug">
                    {f.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing band */}
          <div className="rounded-2xl bg-gradient-to-br from-[var(--accent-softer)] to-transparent border border-accent/15 px-5 py-4 mb-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold mb-0.5">
                Plan mensual
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-3xl tracking-[-0.03em] text-accent num">
                  $14.000
                </span>
                <span className="text-[12px] text-ink-soft">/ mes</span>
              </div>
              <div className="text-[11px] text-ink-softer mt-0.5">
                Cancelás cuando quieras
              </div>
            </div>
            <button
              type="button"
              onClick={handleActivate}
              className="px-6 py-3 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[13.5px] shadow-[0_10px_24px_var(--accent-glow)] hover:bg-accent-hover transition active:translate-y-[1px]"
            >
              Activar Pro →
            </button>
          </div>

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
