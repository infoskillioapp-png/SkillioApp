"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Note, Subject } from "@/lib/types";
import type { AiOutputRow } from "@/lib/api/ai-outputs";
import { ResultModal, type AnyResult } from "./result-modal";
import { Uploader } from "@/app/app/apuntes/_components/uploader";
import { useToast } from "@/components/toast";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { useSalePopup } from "@/components/sale-popup";
import { AnimatedNumber } from "@/components/cult/animated-number";

const SUMMARY_FORMATS = [
  { value: "puntos_clave", label: "Puntos clave" },
  { value: "resumen", label: "Resumen" },
  { value: "ficha", label: "Ficha" },
];

type Props = {
  notes: Note[];
  subjects: Subject[];
  credits: number;
  plan: "free" | "pro" | "semanal";
  expiresAt: string | null;
  freeGenerationsUsed: number;
  history: AiOutputRow[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${Math.max(1, m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-AR");
}

function asResult(o: AiOutputRow): AnyResult | null {
  const c = o.content as Record<string, unknown>;
  if (o.kind === "summary") {
    if (c.format === "resumen" && c.data && typeof (c.data as Record<string, unknown>).text === "string") {
      return { kind: "summary", format: "resumen", text: (c.data as Record<string, unknown>).text as string } as AnyResult;
    }
    if (c.data && typeof c.format === "string") {
      const fmt = c.format as "puntos_clave" | "mapa" | "ficha";
      return { kind: "summary", format: fmt, data: c.data as never } as AnyResult;
    }
    if (typeof c.text === "string") {
      return { kind: "summary", format: (c.format as string) ?? "puntos_clave", text: c.text };
    }
    return null;
  }
  if (o.kind === "flashcards") return { kind: "flashcards", deck: c as never };
  if (o.kind === "simulacro") return { kind: "simulacro", simulacro: c as never };
  return null;
}

const COSTS = { summary: 28, flashcards: 17, simulacro: 18 } as const;
const MAX_CREDITS = 500;
const FREE_LIMIT = 3;

export function IaView({ notes, subjects, credits, plan, expiresAt, freeGenerationsUsed, history }: Props) {
  const router = useRouter();
  const toast = useToast();
  const upgrade = useUpgradeModal();
  const salePopup = useSalePopup();
  const isProCredits = plan === "pro";
  const isSemanal = plan === "semanal";
  const isPaid = isProCredits || (isSemanal && !!expiresAt && new Date(expiresAt) > new Date());
  const [pending, startTransition] = useTransition();
  const [noteId, setNoteId] = useState<string>(notes[0]?.id ?? "");
  const [showUploader, setShowUploader] = useState(false);
  const [format, setFormat] = useState("puntos_clave");
  const [result, setResult] = useState<AnyResult | null>(null);
  const [isPaidResult, setIsPaidResult] = useState(false);
  const [localCredits, setLocalCredits] = useState(credits);
  const [showNoCredits, setShowNoCredits] = useState(false);
  const [showServedNudge, setShowServedNudge] = useState(false);

  // PRO: créditos. Semanal y free: siempre generan (gate en UI).
  const canAfford = (cost: number) => (isProCredits ? localCredits >= cost : true);

  function handleResultClose() {
    setResult(null);
    if (isPaid) return;
    try {
      if (sessionStorage.getItem("skillio_served_nudge")) return;
      sessionStorage.setItem("skillio_served_nudge", "1");
    } catch { /* modo privado */ }
    setShowServedNudge(true);
  }

  // PRO sin créditos → modal de créditos. Free/semanal expirado → no debería llegar acá.
  const showPaywall = () => (isProCredits ? setShowNoCredits(true) : salePopup.open());

  function call(kind: "summary" | "flashcards" | "simulacro") {
    if (!noteId) {
      toast.info("Subí un apunte primero", "Necesitás cargar un PDF, imagen o nota en Apuntes.");
      return;
    }
    const cost = COSTS[kind];
    if (!canAfford(cost)) {
      showPaywall();
      return;
    }
    startTransition(async () => {
      try {
        const url =
          kind === "summary" ? "/api/ai/summarize"
          : kind === "flashcards" ? "/api/ai/flashcards"
          : "/api/ai/simulacro";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: noteId, ...(kind === "summary" ? { format } : {}) }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 402) {
            showPaywall();
          } else {
            toast.error("Algo salió mal", data.error || `HTTP ${res.status}`);
          }
          return;
        }
        if (isProCredits && typeof data.credits_remaining === "number") {
          setLocalCredits(data.credits_remaining);
        }
        if (data.activation_event_id) {
          const f = (window as Window & { fbq?: (...a: unknown[]) => void }).fbq;
          if (f) f("trackCustom", "Activacion", {}, { eventID: data.activation_event_id });
        }
        // Guardar si este resultado es de usuario pago (para content locks)
        setIsPaidResult(!!data.is_paid);
        if (kind === "summary") {
          if (data.format === "resumen") {
            setResult({ kind: "summary", format: "resumen", text: data.data.text } as AnyResult);
          } else {
            setResult({ kind: "summary", format: data.format, data: data.data } as AnyResult);
          }
        }
        else if (kind === "flashcards") setResult({ kind: "flashcards", deck: data.deck });
        else setResult({ kind: "simulacro", simulacro: data.simulacro });
        toast.success(
          kind === "summary" ? "Resumen listo" : kind === "flashcards" ? "Flashcards generadas" : "Simulacro listo",
          isProCredits ? `Quedaron ${data.credits_remaining} créditos.` : "Tu material está listo.",
        );
        router.refresh();
      } catch (e) {
        toast.error("Algo salió mal", e instanceof Error ? e.message : "error");
      }
    });
  }

  const noNotes = notes.length === 0;
  const creditPct = Math.min(100, (localCredits / MAX_CREDITS) * 100);

  return (
    <>
      {/* Header premium */}
      <header className="mb-8">
        {/* Badge PRO grande y llamativo */}
        <div className="inline-flex items-center gap-2 mb-4">
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[#FBF1EF] text-[11px] font-bold tracking-[0.14em] uppercase"
            style={{
              background: "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 50%, #c47b2b 100%)",
              boxShadow: "0 4px 20px var(--accent-glow), 0 0 0 1px rgba(165,64,45,0.3)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M13 2 L4 14 H11 L10 22 L20 10 H13 L13 2 Z" />
            </svg>
            IA Pro
          </div>
          <span className="text-[11px] text-ink-soft">Powered by Claude Opus 4.7</span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1
              className="font-display font-extrabold text-5xl sm:text-6xl tracking-[-0.03em] leading-[1.02]"
              style={{
                background: "linear-gradient(135deg, var(--ink) 0%, var(--accent) 40%, var(--accent-2) 70%, #c47b2b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Tu copiloto
              <br />
              de estudio.
            </h1>
            <p className="text-[13px] text-ink-soft mt-3 max-w-sm">
              Resumí, creá flashcards y generá simulacros de cualquier apunte en segundos.
            </p>
          </div>

          {/* Créditos / Acceso */}
          <div
            className="rounded-2xl border border-rule-soft p-5 min-w-[220px]"
            style={{ background: "var(--paper-warm)" }}
          >
            {isSemanal ? (
              <>
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold mb-1">
                  Acceso hasta
                </div>
                <div className="font-display font-extrabold text-xl text-accent mb-1">
                  {expiresAt
                    ? new Date(expiresAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
                    : "—"}
                </div>
                <div className="text-[10.5px] text-ink-softer">Plan Semanal activo</div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold">
                    Créditos
                  </span>
                  {isProCredits && (
                    <span className="text-[9px] font-bold text-success bg-success-soft px-1.5 py-0.5 rounded-full">
                      Pro
                    </span>
                  )}
                </div>
                <div className="font-display font-extrabold text-3xl flex items-baseline gap-1 mb-2">
                  <span className="text-accent">
                    <AnimatedNumber value={localCredits} stiffness={60} damping={14} />
                  </span>
                  <span className="text-ink-softer text-base font-bold">/ 500</span>
                </div>
                <div className="h-2.5 rounded-full bg-rule-soft overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{
                      width: `${creditPct}%`,
                      background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                      boxShadow: "0 0 8px var(--accent-glow)",
                    }}
                  />
                </div>
                {isProCredits && (
                  <div className="text-[10.5px] text-ink-softer mt-1.5">Se recargan el 1 de cada mes</div>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      {/* Subir + elegir apunte — todo en un solo lugar (sin saltar a otra sección) */}
      {noNotes ? (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold">
              Paso 1 · Subí tu apunte
            </span>
          </div>
          <Uploader subjects={subjects} />
          <p className="text-center text-[12px] text-ink-softer mt-3">
            📸 Foto · ✍️ Tema · 📁 PDF, Word o imagen — la IA lo lee y te lo resume.
          </p>
        </div>
      ) : (
        <div className="mb-7">
          <div
            className="rounded-2xl border border-rule-soft p-4 flex items-center gap-3 flex-wrap"
            style={{ background: "var(--paper-warm)" }}
          >
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold shrink-0">
              Apunte
            </span>
            <select
              value={noteId}
              onChange={(e) => setNoteId(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-paper border border-rule text-sm focus:outline-none focus:border-accent transition"
            >
              {notes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowUploader((v) => !v)}
              className="px-3.5 py-2 rounded-xl border border-rule text-[12.5px] font-semibold text-ink-soft hover:border-accent hover:text-accent transition shrink-0"
            >
              {showUploader ? "Cerrar" : "+ Subir otro"}
            </button>
          </div>
          {showUploader && (
            <div className="mt-3 animate-skillio-fade-in">
              <Uploader subjects={subjects} />
            </div>
          )}
        </div>
      )}

      {/* 3 modo cards — estilo prototipo 3.0 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <ModoCard
          gradient={["#5b8cff", "#3f63ff"]}
          shadowColor="rgba(63,99,255,.38)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
              <path d="M4 5a1 1 0 0 1 1-1h5a3 3 0 0 1 2 1 3 3 0 0 1 2-1h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5a1 1 0 0 1-1-1Z" />
            </svg>
          }
          title="Resumen"
          description="El apunte explicado en puntos clave, resumen o ficha de estudio."
          stat={`${history.filter(h => h.kind === "summary").length} generados`}
          disabled={noNotes || pending}
          extra={
            <div className="flex flex-wrap gap-1.5 mt-2 mb-1">
              {SUMMARY_FORMATS.map((f) => {
                const isSelected = format === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFormat(f.value); }}
                    className="px-2.5 py-1 rounded-full text-[10.5px] font-bold transition cursor-pointer"
                    style={{
                      background: isSelected ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.2)",
                      color: isSelected ? "#3f63ff" : "rgba(255,255,255,.9)",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          }
          onClick={() => call("summary")}
        />
        <ModoCard
          gradient={["#9a63f7", "#7c3aed"]}
          shadowColor="rgba(124,58,237,.38)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
              <rect x="3" y="6" width="14" height="12" rx="2" />
              <path d="M8 3h13v12" />
            </svg>
          }
          title="Flashcards"
          description="Mazo de tarjetas para memorizar con repetición espaciada."
          stat={`${history.filter(h => h.kind === "flashcards").length} mazos`}
          disabled={noNotes || pending}
          onClick={() => call("flashcards")}
        />
        <ModoCard
          gradient={["#ff5d79", "#e4264f"]}
          shadowColor="rgba(228,38,79,.35)"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="4.5" />
              <circle cx="12" cy="12" r="1" />
            </svg>
          }
          title="Simulacro"
          description="Examen tipo parcial: opción múltiple, V/F y preguntas cortas."
          stat={`${history.filter(h => h.kind === "simulacro").length} simulacros`}
          disabled={noNotes || pending}
          onClick={() => call("simulacro")}
        />
      </div>

      {pending && (
        <div
          className="mb-7 p-5 rounded-2xl border border-accent/20 flex items-center gap-4"
          style={{ background: "var(--accent-softer)" }}
        >
          <div className="relative w-5 h-5 shrink-0">
            <span className="w-5 h-5 rounded-full bg-accent animate-ping absolute opacity-40" />
            <span className="w-5 h-5 rounded-full bg-accent relative flex" />
          </div>
          <div>
            <div className="font-display font-semibold text-sm text-ink">Claude está leyendo tu apunte…</div>
            <div className="text-[11.5px] text-ink-soft">Si es un PDF largo lo procesamos por partes — puede tardar un poco más.</div>
          </div>
        </div>
      )}

      {/* Historial */}
      <section>
        <h2 className="font-display font-bold text-lg mb-4">Generado recientemente</h2>
        {history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rule bg-paper-warm p-10 text-center">
            <p className="text-sm text-ink-soft">Todavía no generaste nada. Probá una herramienta arriba.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => { const r = asResult(o); if (r) setResult(r); }}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-paper border border-rule-soft hover:border-accent/30 hover:-translate-y-[1px] hover:shadow-card transition-all duration-300 text-left"
              >
                <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent flex items-center justify-center text-lg shrink-0">
                  {o.kind === "summary" ? "✨" : o.kind === "flashcards" ? "🃏" : "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-[14px] truncate">{o.title ?? "(sin título)"}</div>
                  <div className="text-[11.5px] text-ink-soft">
                    {o.kind === "summary" ? `Resumen · ${o.format ?? ""}` : o.kind === "flashcards" ? "Flashcards" : "Simulacro"}{" "}
                    · {timeAgo(o.created_at)} · {o.credits_used} cr
                  </div>
                </div>
                <span className="text-[11.5px] text-accent font-bold">Ver →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {result && (
        <ResultModal
          result={result}
          onClose={handleResultClose}
          isPaid={isPaidResult || isPaid}
          onPaywall={(ctx) => salePopup.open(ctx)}
        />
      )}
      {showNoCredits && <NoCreditsModal onClose={() => setShowNoCredits(false)} />}
      {showServedNudge && (
        <ServedNudge
          onUpgrade={() => {
            setShowServedNudge(false);
            upgrade.open();
          }}
          onClose={() => setShowServedNudge(false)}
        />
      )}
    </>
  );
}

// Empujón tras cerrar un resultado: modal centrado que interrumpe (en el pico
// de deseo). Cierra con la cruz, Escape, click afuera o "Seguir gratis".
function ServedNudge({ onUpgrade, onClose }: { onUpgrade: () => void; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-paper border border-rule shadow-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "skillio-modal-pop .4s cubic-bezier(.34,1.56,.64,1) both" }}
      >
        {/* halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-44 rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 60%)" }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-paper-warm text-ink-soft hover:text-ink hover:bg-bg-2 transition flex items-center justify-center z-10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative px-7 pt-9 pb-7 text-center">
          <div className="text-5xl mb-4">🔥</div>
          <h2 className="font-display font-extrabold text-[26px] tracking-[-0.03em] leading-tight mb-2">
            ¿Te sirvió? Con PRO hacés{" "}
            <span className="italic text-accent">ilimitados.</span>
          </h2>
          <p className="text-[13px] text-ink-soft max-w-xs mx-auto leading-snug mb-7">
            Estás en racha — no la cortes. Seguí generando resúmenes, flashcards y
            simulacros sin frenar hasta el parcial.
          </p>

          <button
            type="button"
            onClick={onUpgrade}
            className="w-full px-6 py-3.5 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[14.5px] shadow-[0_10px_24px_var(--accent-glow)] hover:bg-accent-hover transition active:translate-y-[1px]"
          >
            Pasate a PRO →
          </button>
          <button
            type="button"
            onClick={onClose}
            className="block mx-auto mt-3 text-[12.5px] text-ink-softer hover:text-ink-soft transition"
          >
            Seguir gratis
          </button>
        </div>
      </div>
    </div>
  );
}

function NoCreditsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1c1c1a 0%, #2a1208 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow decorativo */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-40 rounded-full blur-3xl opacity-40"
          style={{ background: "var(--accent-glow)" }}
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white/50 hover:text-white transition flex items-center justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className="relative px-8 pt-10 pb-8 text-center">
          <div className="text-5xl mb-4">🧠</div>
          <h2 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-white mb-3 leading-snug">
            ¡Te quedaste sin nafta<br />para estudiar!
          </h2>
          <p className="text-[13.5px] text-white/60 leading-relaxed mb-7">
            Metele pata a tus parciales recargando créditos extra o esperando a tu próxima renovación mensual.
          </p>

          {/* Espacio para botón de Mercado Pago */}
          <div
            className="w-full py-3 rounded-2xl border border-dashed border-white/20 text-white/30 text-[12px] mb-4 cursor-not-allowed"
          >
            💳 Comprar pack de créditos — próximamente
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[12px] text-white/40 hover:text-white/60 transition"
          >
            Volver a la app
          </button>
        </div>
      </div>
    </div>
  );
}

// Modo card — gradiente vibrante, estilo prototipo 3.0
function ModoCard({
  gradient, shadowColor, icon, title, description, stat, extra, disabled, onClick,
}: {
  gradient: [string, string];
  shadowColor: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  stat: string;
  extra?: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group relative overflow-hidden rounded-[24px] p-5 text-left flex flex-col transition-all duration-250 hover:-translate-y-[5px] active:translate-y-[-2px] active:scale-[.985] disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(155deg,${gradient[0]} 0%,${gradient[1]} 100%)`,
        boxShadow: `0 12px 32px ${shadowColor}`,
        color: "#fff",
      }}
    >
      {/* blobs de profundidad */}
      <div aria-hidden className="pointer-events-none absolute w-[130px] h-[130px] rounded-full top-[-44px] right-[-30px]" style={{ background: "rgba(255,255,255,.16)" }} />
      <div aria-hidden className="pointer-events-none absolute w-[90px] h-[90px] rounded-full bottom-[-30px] left-[-20px]" style={{ background: "rgba(255,255,255,.08)" }} />
      {/* gloss sweep on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 w-[55%] opacity-0 group-hover:opacity-100 z-[2]"
        style={{
          left: "-80%",
          background: "linear-gradient(100deg,transparent,rgba(255,255,255,.38),transparent)",
          transform: "skewX(-18deg)",
          animation: "none",
          transition: "left .7s ease, opacity .3s",
        }}
      />

      {/* top row: icon + stat badge */}
      <div className="relative z-10 flex items-start justify-between mb-10">
        <span className="w-12 h-12 rounded-[15px] flex items-center justify-center" style={{ background: "rgba(255,255,255,.22)" }}>
          {icon}
        </span>
        <span className="rounded-[14px] px-3 py-1.5 text-center min-w-[52px]" style={{ background: "#fff", color: "var(--ink)", boxShadow: "0 6px 14px rgba(0,0,0,.12)" }}>
          <b className="block font-display font-extrabold text-[18px] leading-none num">{stat.split(" ")[0]}</b>
          <span className="text-[9.5px] text-ink-soft font-semibold">{stat.split(" ").slice(1).join(" ")}</span>
        </span>
      </div>

      {/* title + description */}
      <div className="relative z-10 flex-1">
        <div className="font-display font-bold text-[18px] mb-1">{title}</div>
        <div className="text-[12.5px] opacity-90 leading-snug min-h-[34px]">{description}</div>
        {extra}
      </div>

      {/* bottom: go arrow */}
      <div className="relative z-10 flex items-center justify-between mt-4">
        <span className="text-[11.5px] font-semibold opacity-95">Generar</span>
        <span className="w-[34px] h-[34px] rounded-full flex items-center justify-center transition group-hover:translate-x-[2px] group-hover:scale-[1.08]" style={{ background: "#fff" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: gradient[1] }}>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </button>
  );
}
