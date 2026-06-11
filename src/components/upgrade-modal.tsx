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
import { useOfferCountdown } from "./offer-countdown";

type UpgradeVariant = "generic" | "credits";

type UpgradeCtx = {
  open: (variant?: UpgradeVariant) => void;
  close: () => void;
  isOpen: boolean;
};

const Ctx = createContext<UpgradeCtx | null>(null);

export function useUpgradeModal() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUpgradeModal tiene que estar dentro de <UpgradeModalProvider>");
  return c;
}

// Features de PRO (espejo de la landing). Checklist dentro de la tarjeta PRO.
const PRO_FEATURES = [
  "500 créditos mensuales de IA",
  "Resúmenes, flashcards y simulacros ilimitados",
  "Repetición espaciada inteligente",
  "Modelos avanzados de IA",
  "Subir a Comunidad y ganar XP",
  "Pomodoro, agenda y logros",
];

// Premium es ficticio ("Próximamente"): solo ancla de precio. No es funcional.
const PREMIUM_FEATURES = [
  "Modelos de IA más avanzados",
  "Tutor IA personalizado 24/7",
  "Generaciones ilimitadas",
  "Soporte prioritario",
  "Funciones exclusivas y colaborativo",
];

export function UpgradeModalProvider({
  children,
  offerStartedAt = null,
}: {
  children: React.ReactNode;
  offerStartedAt?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [variant, setVariant] = useState<UpgradeVariant>("generic");
  const open = useCallback((v: UpgradeVariant = "generic") => {
    setVariant(v);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  const value = useMemo<UpgradeCtx>(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {isOpen && (
        <UpgradeModal onClose={close} variant={variant} offerStartedAt={offerStartedAt} />
      )}
    </Ctx.Provider>
  );
}

function UpgradeModal({
  onClose,
  variant,
  offerStartedAt,
}: {
  onClose: () => void;
  variant: UpgradeVariant;
  offerStartedAt: string | null;
}) {
  const toast = useToast();
  const { active: offerActive, hms } = useOfferCountdown(offerStartedAt);

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

  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscription/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error("Error", data.error ?? "No se pudo iniciar el pago. Intentá de nuevo.");
        setLoading(false);
        return;
      }
      // Redirigir a MercadoPago
      window.location.href = data.init_point;
    } catch {
      toast.error("Error", "No se pudo conectar con el servidor.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-paper border border-rule shadow-lg"
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
            {variant === "credits" ? (
              <>
                <h2 className="font-display font-extrabold text-[25px] tracking-[-0.03em] leading-tight mb-2">
                  Se te acabaron los créditos en plena preparación del parcial{" "}
                  <span className="italic text-accent">→ pasate a PRO y seguí.</span>
                </h2>
                <p className="text-[13px] text-ink-soft max-w-sm mx-auto leading-snug">
                  Seguí generando resúmenes, flashcards y simulacros sin frenar el envión.
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display font-extrabold text-[28px] tracking-[-0.03em] leading-tight mb-2">
                  Estudiá <span className="italic text-accent">sin límites.</span><br />
                  Aprobá <span className="italic text-accent">más fácil.</span>
                </h2>
                <p className="text-[13px] text-ink-soft max-w-sm mx-auto leading-snug">
                  Desbloqueá toda la potencia de Skillio y convertí cada apunte en
                  material listo para rendir.
                </p>
              </>
            )}
          </div>

          {/* Banner de oferta con cronómetro (solo si la oferta sigue viva) */}
          {offerActive && (
            <div className="mb-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-accent text-[#FBF1EF] text-[13px] font-semibold shadow-[0_8px_22px_var(--accent-glow)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 shrink-0">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2.5M9 2h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>El precio de lanzamiento termina en</span>
              <span className="num tabular-nums font-extrabold tracking-wide">{hms}</span>
            </div>
          )}

          {/* Dos planes: PRO (real) + Premium (próximamente, ancla) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* PRO */}
            <div className="relative rounded-3xl border-2 border-accent bg-paper-warm p-5 flex flex-col">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-ink text-paper text-[10px] font-bold tracking-[0.08em] whitespace-nowrap">
                ★ EL MÁS ELEGIDO
              </span>

              <div className="mb-1 mt-1">
                <h3 className="font-display font-extrabold text-2xl tracking-[-0.02em]">PRO</h3>
                <p className="text-[12px] text-ink-soft">Todo lo que necesitás para aprobar</p>
              </div>

              {/* Precio: ancla tachada + precio de lanzamiento */}
              <div className="mt-3 mb-1">
                <div className="text-[11px] uppercase tracking-[0.12em] text-accent font-bold mb-0.5">
                  Precio de lanzamiento
                </div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[15px] text-ink-softer line-through num">$29.999</span>
                  <span className="font-display font-extrabold text-4xl tracking-[-0.03em] text-accent num">
                    $16.000
                  </span>
                  <span className="text-[12px] text-ink-soft">/ mes</span>
                </div>
                <p className="text-[11.5px] text-ink-softer mt-1">
                  Menos que una hamburguesa al mes — contra recursar una materia.
                </p>
              </div>

              <button
                type="button"
                onClick={handleActivate}
                disabled={loading}
                className="mt-4 w-full px-6 py-3 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[14px] shadow-[0_10px_24px_var(--accent-glow)] hover:bg-accent-hover transition active:translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Redirigiendo…" : "Empezá gratis →"}
              </button>
              <p className="text-center text-[11px] text-ink-softer mt-2">
                Sin tarjeta · Cancelás cuando quieras
              </p>

              <ul className="mt-4 pt-4 border-t border-rule-soft space-y-2">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-success-soft text-success flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-2.5 h-2.5">
                        <path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* PREMIUM — próximamente (ancla psicológica) */}
            <div className="relative rounded-3xl border border-rule bg-paper p-5 flex flex-col overflow-hidden">
              {/* Cinta diagonal "Próximamente" */}
              <div
                aria-hidden
                className="absolute top-4 right-[-42px] rotate-45 px-12 py-1 text-[9px] font-bold tracking-[0.12em] text-paper"
                style={{ background: "var(--accent-2, #4a6b8a)" }}
              >
                PRÓXIMAMENTE
              </div>

              <div className="mb-1 mt-1">
                <h3 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-ink-soft">
                  Premium
                </h3>
                <p className="text-[12px] text-ink-softer">Todo lo de PRO, llevado al límite.</p>
              </div>

              <div className="mt-3 mb-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display font-extrabold text-4xl tracking-[-0.03em] text-ink-soft num">
                    $29.999
                  </span>
                  <span className="text-[12px] text-ink-softer">/ mes</span>
                </div>
              </div>

              <div className="mt-4 w-full px-6 py-3 rounded-full bg-paper-warm border border-rule text-ink-softer text-[13.5px] font-semibold text-center cursor-not-allowed flex items-center justify-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 1 1 8 0v3" strokeLinecap="round" />
                </svg>
                Próximamente
              </div>

              <ul className="mt-4 pt-4 border-t border-rule-soft space-y-2 opacity-40 blur-[1.5px] select-none">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-rule-soft flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-2.5 h-2.5">
                        <path d="M5 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center text-[11px] text-ink-softer mb-3">
            Probás gratis y sin tarjeta · Cancelás cuando quieras · Pagos seguros con Mercado Pago
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
