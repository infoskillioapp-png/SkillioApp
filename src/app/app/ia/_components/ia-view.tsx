"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Note } from "@/lib/types";
import type { AiOutputRow } from "@/lib/api/ai-outputs";
import { ResultModal, type AnyResult } from "./result-modal";
import { useToast } from "@/components/toast";
import { useUpgradeModal } from "@/components/upgrade-modal";
import { GlowButton } from "@/components/cult/glow-button";
import { AnimatedNumber } from "@/components/cult/animated-number";

const SUMMARY_FORMATS = [
  { value: "puntos_clave", label: "Puntos clave" },
  { value: "resumen", label: "Resumen" },
  { value: "ficha", label: "Ficha" },
];

type Props = {
  notes: Note[];
  credits: number;
  plan: "free" | "pro";
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

export function IaView({ notes, credits, plan, freeGenerationsUsed, history }: Props) {
  const router = useRouter();
  const toast = useToast();
  const upgrade = useUpgradeModal();
  const isPro = plan === "pro";
  const [pending, startTransition] = useTransition();
  const [noteId, setNoteId] = useState<string>(notes[0]?.id ?? "");
  const [format, setFormat] = useState("puntos_clave");
  const [result, setResult] = useState<AnyResult | null>(null);
  const [localCredits, setLocalCredits] = useState(credits);
  // Free: generaciones gratis restantes (contador interno, no se muestra).
  const [freeGenLeft, setFreeGenLeft] = useState(
    Math.max(0, FREE_LIMIT - freeGenerationsUsed),
  );
  const [showNoCredits, setShowNoCredits] = useState(false);

  // PRO se mide por créditos; free por generaciones restantes.
  const canAfford = (cost: number) => (isPro ? localCredits >= cost : freeGenLeft > 0);

  // Free agotó las 3 gratis → popup PRO (a MercadoPago). PRO sin créditos →
  // modal de créditos (espera renovación / pack próximamente).
  const showPaywall = () => (isPro ? setShowNoCredits(true) : upgrade.open("credits"));

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
        if (isPro) {
          if (typeof data.credits_remaining === "number") setLocalCredits(data.credits_remaining);
        } else {
          setFreeGenLeft((n) => Math.max(0, n - 1));
        }
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
          isPro ? `Quedaron ${data.credits_remaining} créditos.` : "Tu material está listo.",
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

          {/* Créditos — visual mejorado */}
          <div
            className="rounded-2xl border border-rule-soft p-5 min-w-[220px]"
            style={{ background: "var(--paper-warm)" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold">
                Créditos
              </span>
              {plan === "pro" && (
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
            {isPro && (
              <div className="text-[10.5px] text-ink-softer mt-1.5">Se recargan el 1 de cada mes</div>
            )}
          </div>
        </div>
      </header>

      {/* Selector de apunte */}
      {noNotes ? (
        <div
          className="rounded-3xl border border-dashed border-accent/30 p-10 text-center mb-8 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--paper) 0%, var(--accent-softer) 100%)" }}
        >
          <div className="text-5xl mb-4">📁</div>
          <h3 className="font-display font-bold text-xl mb-2">Subí un apunte primero</h3>
          <p className="text-sm text-ink-soft mb-5">La IA necesita un PDF, imagen o nota para trabajar.</p>
          <Link
            href="/app/apuntes"
            className="inline-block px-6 py-3 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-sm hover:bg-accent-hover transition shadow-[0_8px_24px_var(--accent-glow)]"
          >
            Ir a Mis Apuntes →
          </Link>
        </div>
      ) : (
        <div
          className="rounded-2xl border border-rule-soft p-4 mb-7 flex items-center gap-3 flex-wrap"
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
        </div>
      )}

      {/* 3 tool cards — premium design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <PremiumToolCard
          icon="✨"
          title="Resumen IA"
          description="Convertí un apunte en puntos clave, resumen académico o ficha de estudio."
          cost={COSTS.summary}
          accentColor="var(--accent)"
          glowColor="rgba(165,64,45,0.35)"
          disabled={noNotes || pending || !canAfford(COSTS.summary)}
          extra={
            <div className="flex flex-wrap gap-1.5 mt-1 mb-4">
              {SUMMARY_FORMATS.map((f) => {
                const isSelected = format === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFormat(f.value)}
                    className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition cursor-pointer"
                    style={{
                      backgroundColor: isSelected ? "var(--accent)" : "var(--paper-warm)",
                      color: isSelected ? "#FBF1EF" : "var(--ink-soft)",
                      border: `1px solid ${isSelected ? "var(--accent)" : "var(--rule)"}`,
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
        <PremiumToolCard
          icon="🃏"
          title="Flashcards"
          description="Mazo de tarjetas para repetición espaciada generadas del apunte."
          cost={COSTS.flashcards}
          accentColor="var(--success)"
          glowColor="rgba(74,124,89,0.35)"
          disabled={noNotes || pending || !canAfford(COSTS.flashcards)}
          onClick={() => call("flashcards")}
        />
        <PremiumToolCard
          icon="📝"
          title="Simulacro"
          description="5 a 8 preguntas mezclando opción múltiple, V/F y desarrollo corto."
          cost={COSTS.simulacro}
          accentColor="var(--warning)"
          glowColor="rgba(196,123,43,0.35)"
          disabled={noNotes || pending || !canAfford(COSTS.simulacro)}
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
            <div className="text-[11.5px] text-ink-soft">Puede tardar 10-30 segundos</div>
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

      {result && <ResultModal result={result} onClose={() => setResult(null)} />}
      {showNoCredits && <NoCreditsModal onClose={() => setShowNoCredits(false)} />}
    </>
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

function PremiumToolCard({
  icon, title, description, cost, accentColor, glowColor, extra, disabled, onClick,
}: {
  icon: string;
  title: string;
  description: string;
  cost: number;
  accentColor: string;
  glowColor: string;
  extra?: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className="group rounded-3xl border border-rule-soft p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
      style={{ background: "var(--paper)" }}
    >
      {/* Glow en hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-70 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }}
      />

      {/* Ícono */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-5 transition-transform duration-300 group-hover:scale-110 relative"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${glowColor}, transparent 80%)`,
          border: `1px solid ${accentColor}30`,
        }}
      >
        {icon}
      </div>

      <h3 className="font-display font-bold text-lg mb-2 relative">{title}</h3>
      <p className="text-[12.5px] text-ink-soft mb-4 flex-1 relative">{description}</p>
      {extra}

      <div className="flex items-center justify-between gap-3 relative">
        <span className="text-[11px] text-ink-soft">
          <strong className="text-ink num">{cost}</strong> créditos
        </span>
        <GlowButton
          onClick={onClick}
          disabled={disabled}
          glowColor={glowColor}
          className="text-[#FBF1EF] text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 6px 20px ${glowColor}`,
            padding: "8px 20px",
          }}
        >
          Generar
        </GlowButton>
      </div>
    </div>
  );
}
