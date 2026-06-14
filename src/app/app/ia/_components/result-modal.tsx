"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkmapRender } from "./markmap-render";

// Estructuras del nuevo formato (Claude devuelve JSON)
export type PuntosClaveData = {
  title: string;
  intro?: string;
  points: {
    emoji: string;
    title: string;
    description: string;
    category?: string;
  }[];
};
export type MapaData = { title: string; outline: string };
export type FichaData = {
  title: string;
  topic: string;
  sections: {
    heading: string;
    icon: string;
    items: { label: string; detail: string }[];
  }[];
};

// SummaryResult tiene dos shapes: viejo (markdown text) y nuevo (data estructurada)
export type SummaryResult =
  | { kind: "summary"; format: "puntos_clave"; data: PuntosClaveData }
  | { kind: "summary"; format: "mapa"; data: MapaData }
  | { kind: "summary"; format: "ficha"; data: FichaData }
  | { kind: "summary"; format: "resumen"; text: string }
  | { kind: "summary"; format: string; text: string }; // legacy
export type FlashcardsResult = {
  kind: "flashcards";
  deck: {
    deck_title: string;
    cards: { front: string; back: string; category?: string }[];
  };
};
export type SimulacroQuestion =
  | {
      kind: "multiple_choice";
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }
  | { kind: "true_false"; question: string; correct: boolean; explanation: string }
  | { kind: "short_answer"; question: string; correct: string; explanation: string };

export type SimulacroResult = {
  kind: "simulacro";
  simulacro: { title: string; questions: SimulacroQuestion[] };
};

export type AnyResult = SummaryResult | FlashcardsResult | SimulacroResult;

// chromeless: para contextos SIN el chrome de la app (topbar + bottom-nav), como
// el demo del onboarding. Ahí el modal ocupa toda la pantalla (no descuenta esos
// 52+64px que no existen) y la hoja inferior va al ras del borde.
type Props = { result: AnyResult; onClose: () => void; chromeless?: boolean };

export function ResultModal({ result, onClose, chromeless = false }: Props) {
  const [footer, setFooter] = useState<React.ReactNode>(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPdf() {
    if (result.kind !== "summary" || downloading) return;
    setDownloading(true);
    try {
      const mod = await import("./summary-pdf");
      await mod.downloadSummaryPdf(result, title);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    // Bloquear scroll del body mientras el modal está abierto
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const summaryTitle =
    result.kind === "summary" && "data" in result
      ? (result.data as { title?: string }).title
      : undefined;
  const title =
    result.kind === "summary"
      ? (summaryTitle ?? "Resumen generado")
      : result.kind === "flashcards"
        ? result.deck.deck_title
        : result.simulacro.title;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-skillio-fade-in ${
        chromeless
          ? "pb-[env(safe-area-inset-bottom)] md:p-4"
          : "pb-[calc(64px_+_env(safe-area-inset-bottom))] md:p-4 md:pb-4"
      }`}
      onClick={onClose}
    >
      <div
        className={`relative w-full rounded-t-3xl md:rounded-3xl bg-paper border border-rule shadow-lg flex flex-col ${
          result.kind === "summary" && "data" in result && result.format === "mapa"
            ? "max-w-6xl"
            : result.kind === "summary"
              ? "max-w-5xl"
              : "max-w-4xl"
        }`}
        style={{ maxHeight: chromeless ? "calc(100dvh - 32px)" : "calc(100dvh - 52px - 64px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — siempre visible */}
        <header className="flex items-center justify-between px-4 py-3 md:px-7 md:py-5 border-b border-rule-soft shrink-0">
          <div className="min-w-0 mr-2">
            <div className="eyebrow mb-0.5 truncate">
              {result.kind === "summary"
                ? `Resumen · ${result.format.replace("_", " ")}`
                : result.kind === "flashcards"
                  ? `Mazo de ${result.deck.cards.length} flashcards`
                  : `Simulacro de ${result.simulacro.questions.length} preguntas`}
            </div>
            <h2 className="font-display font-extrabold text-base md:text-xl tracking-[-0.02em] truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {result.kind === "summary" && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-2 md:py-2 rounded-full bg-accent text-[#FBF1EF] text-[12.5px] font-display font-semibold hover:bg-accent-hover transition disabled:opacity-60 disabled:cursor-wait"
                aria-label="Descargar resumen en PDF"
              >
                {downloading ? (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5 animate-spin">
                      <path d="M21 12a9 9 0 1 1-6.2-8.5" strokeLinecap="round" />
                    </svg>
                    <span className="hidden sm:inline">Generando…</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="w-3.5 h-3.5">
                      <path d="M12 3v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" />
                    </svg>
                    <span className="hidden sm:inline">Descargar PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 md:w-9 md:h-9 rounded-full border border-rule hover:border-ink-soft hover:rotate-90 transition-all duration-300 flex items-center justify-center shrink-0 text-lg"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Contenido scrolleable */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-7"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {result.kind === "summary" && <SummaryDispatcher result={result} />}
          {result.kind === "flashcards" && <FlashcardsView deck={result.deck} onFooter={setFooter} />}
          {result.kind === "simulacro" && (
            <SimulacroView simulacro={result.simulacro} onFooter={setFooter} />
          )}
        </div>

        {/* Footer de navegación — fuera del scroll, siempre visible */}
        {footer && (
          <div className="shrink-0 border-t border-rule-soft px-4 py-3 md:px-8 bg-paper">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryDispatcher({ result }: { result: SummaryResult }) {
  if (result.format === "resumen" && "text" in result) return <ResumenView text={result.text} />;
  if (result.format === "puntos_clave" && "data" in result) return <PuntosClaveView data={result.data as PuntosClaveData} />;
  if (result.format === "mapa" && "data" in result) return <MapaView data={result.data as MapaData} />;
  if (result.format === "ficha" && "data" in result) return <FichaView data={result.data as FichaData} />;
  // legacy: text field fallback
  if ("text" in result) return <LegacyMarkdownView text={result.text as string} />;
  return null;
}

const BRAND_SIGNATURE = "\n\n⚡ Resumen generado con Skilio.app - Aprobá tus parciales con IA.";

function ResumenView({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text + BRAND_SIGNATURE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      {/* Botón copiar flotante */}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-0 right-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all duration-200"
        style={{
          background: copied ? "var(--success-soft)" : "var(--paper-warm)",
          borderColor: copied ? "var(--success)" : "var(--rule)",
          color: copied ? "var(--success)" : "var(--ink-soft)",
        }}
        aria-label="Copiar resumen"
      >
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ¡Copiado!
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
            </svg>
            Copiar
          </>
        )}
      </button>

      {/* Markdown renderizado */}
      <div className="prose prose-base max-w-none pt-8
        prose-headings:font-display prose-headings:tracking-tight prose-headings:text-ink
        prose-h2:text-2xl prose-h2:font-extrabold prose-h2:mt-8 prose-h2:mb-3
        prose-h3:text-lg prose-h3:font-bold prose-h3:mt-5 prose-h3:mb-2
        prose-p:text-[15.5px] prose-p:leading-[1.75] prose-p:text-ink
        prose-strong:text-ink prose-strong:font-bold
        prose-li:text-[15px] prose-li:text-ink prose-li:leading-[1.7]
        prose-table:text-[14px] prose-th:font-bold prose-th:text-ink prose-td:text-ink-soft
        prose-code:bg-paper-warm prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-accent prose-code:text-[13px]
        prose-blockquote:border-l-accent prose-blockquote:text-ink-soft
        [&_table]:border-collapse [&_td]:border [&_td]:border-rule-soft [&_td]:px-4 [&_td]:py-2.5
        [&_th]:border [&_th]:border-rule-soft [&_th]:px-4 [&_th]:py-2.5 [&_th]:bg-paper-warm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
    </div>
  );
}

function LegacyMarkdownView({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap font-sans text-[14.5px] leading-[1.6] text-ink">
      {text}
    </div>
  );
}

const CATEGORY_TONES = [
  { bg: "var(--accent-soft)", text: "var(--accent)" },
  { bg: "var(--success-soft)", text: "var(--success)" },
  { bg: "var(--warning-soft)", text: "var(--warning)" },
  { bg: "var(--info-soft)", text: "var(--info)" },
];

function PuntosClaveView({ data }: { data: PuntosClaveData }) {
  // Asignar un tono por categoria (ciclico)
  const catTone = new Map<string, (typeof CATEGORY_TONES)[number]>();
  let idx = 0;
  for (const p of data.points) {
    if (p.category && !catTone.has(p.category)) {
      catTone.set(p.category, CATEGORY_TONES[idx % CATEGORY_TONES.length]);
      idx++;
    }
  }

  return (
    <div>
      {data.intro && (
        <p className="text-[13.5px] text-ink-soft italic mb-5 max-w-2xl">
          {data.intro}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.points.map((p, i) => {
          const tone = p.category
            ? catTone.get(p.category) ?? CATEGORY_TONES[0]
            : CATEGORY_TONES[i % CATEGORY_TONES.length];
          return (
            <div
              key={i}
              className="rounded-2xl bg-paper border border-rule-soft p-5 flex gap-4 hover:border-rule transition"
              style={{ borderLeft: `4px solid ${tone.text}` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: tone.bg }}
              >
                {p.emoji}
              </div>
              <div className="min-w-0 flex-1">
                {p.category && (
                  <div
                    className="inline-block text-[9.5px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-full mb-1.5"
                    style={{ background: tone.bg, color: tone.text }}
                  >
                    {p.category}
                  </div>
                )}
                <div className="font-display font-bold text-[15px] tracking-[-0.01em] mb-1 leading-snug">
                  {p.title}
                </div>
                <p className="text-[13px] text-ink-soft leading-[1.5]">
                  {p.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MapaView({ data }: { data: MapaData }) {
  return (
    <div>
      <MarkmapRender markdown={data.outline} />
    </div>
  );
}

function FichaView({ data }: { data: FichaData }) {
  return (
    <div>
      <div className="mb-5">
        <div className="eyebrow mb-1">Tema</div>
        <div className="font-display font-bold text-lg text-accent">
          {data.topic}
        </div>
      </div>

      <div className="space-y-5">
        {data.sections.map((sec, i) => (
          <section
            key={i}
            className="rounded-2xl bg-paper border border-rule-soft overflow-hidden"
          >
            <header className="flex items-center gap-3 px-5 py-3 bg-paper-warm border-b border-rule-soft">
              <span className="text-xl">{sec.icon}</span>
              <h3 className="font-display font-bold text-base tracking-[-0.01em]">
                {sec.heading}
              </h3>
            </header>
            <div className="divide-y divide-rule-soft">
              {sec.items.map((it, j) => (
                <div key={j} className="px-5 py-3 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2">
                  <div className="font-display font-semibold text-[13.5px] text-accent">
                    {it.label}
                  </div>
                  <div className="text-[13.5px] text-ink leading-[1.55]">
                    {it.detail}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function FlashcardsView({
  deck,
  onFooter,
}: {
  deck: FlashcardsResult["deck"];
  onFooter: (node: React.ReactNode) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = deck.cards[idx];

  function next() { setFlipped(false); setIdx((i) => Math.min(i + 1, deck.cards.length - 1)); }
  function prev() { setFlipped(false); setIdx((i) => Math.max(i - 1, 0)); }

  useEffect(() => {
    onFooter(
      <div className="flex items-center justify-between">
        <button type="button" onClick={prev} disabled={idx === 0}
          className="px-4 py-2.5 rounded-full border border-rule text-sm font-medium hover:border-ink-soft transition disabled:opacity-40">
          ← Anterior
        </button>
        <div className="flex-1 mx-3 h-1 rounded-full bg-rule-soft overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-[width] duration-300"
            style={{ width: `${((idx + 1) / deck.cards.length) * 100}%` }} />
        </div>
        <button type="button" onClick={next} disabled={idx === deck.cards.length - 1}
          className="px-4 py-2.5 rounded-full bg-accent text-[#FBF1EF] text-sm font-display font-semibold hover:bg-accent-hover transition disabled:opacity-40">
          Siguiente →
        </button>
      </div>
    );
  }, [idx, deck.cards.length]);

  if (!card) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-[12.5px] text-ink-soft">
        <span>Tarjeta <strong className="text-ink">{idx + 1}</strong> de {deck.cards.length}</span>
        {card.category && (
          <span className="px-2.5 py-1 rounded-full bg-accent-soft text-accent text-[11px] font-semibold">
            {card.category}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="w-full min-h-[200px] rounded-2xl border border-rule bg-paper-warm p-6 text-left transition hover:border-ink-soft flex flex-col justify-center"
      >
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-softer mb-2">
          {flipped ? "Respuesta" : "Pregunta · tocá para ver respuesta"}
        </div>
        <div className={`font-display ${flipped ? "text-[18px] leading-snug" : "text-2xl font-bold"} tracking-[-0.01em]`}>
          {flipped ? card.back : card.front}
        </div>
      </button>
    </div>
  );
}

type AnswerState = "empty" | "selected" | "correct" | "wrong";

const STATE_STYLE: Record<
  AnswerState,
  { bg: string; border: string; text: string; letterBg: string; letterText: string }
> = {
  empty: {
    bg: "var(--paper)",
    border: "var(--rule)",
    text: "var(--ink)",
    letterBg: "var(--paper-warm)",
    letterText: "var(--ink-soft)",
  },
  selected: {
    bg: "var(--accent-soft)",
    border: "var(--accent)",
    text: "var(--ink)",
    letterBg: "var(--accent)",
    letterText: "#FBF1EF",
  },
  correct: {
    bg: "var(--success-soft)",
    border: "var(--success)",
    text: "var(--ink)",
    letterBg: "var(--success)",
    letterText: "#FBF1EF",
  },
  wrong: {
    bg: "var(--accent-soft)",
    border: "var(--danger)",
    text: "var(--ink)",
    letterBg: "var(--danger)",
    letterText: "#FBF1EF",
  },
};

function SimulacroView({
  simulacro,
  onFooter,
}: {
  simulacro: SimulacroResult["simulacro"];
  onFooter: (node: React.ReactNode) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);

  const total = simulacro.questions.length;
  const q = simulacro.questions[idx];

  function answer(value: unknown) {
    setAnswers((a) => ({ ...a, [idx]: value }));
  }
  function reveal() {
    setRevealed((r) => ({ ...r, [idx]: true }));
  }
  function next() {
    if (idx === total - 1) setFinished(true);
    else setIdx((i) => i + 1);
  }
  function prev() {
    setIdx((i) => Math.max(i - 1, 0));
  }
  function restart() {
    setAnswers({});
    setRevealed({});
    setIdx(0);
    setFinished(false);
  }

  // Score: cuenta multiple_choice + true_false que esten revealed y matcheen
  const score = simulacro.questions.reduce((acc, qq, i) => {
    if (!revealed[i]) return acc;
    const a = answers[i];
    if (qq.kind === "multiple_choice" && a === qq.correct) return acc + 1;
    if (qq.kind === "true_false" && a === qq.correct) return acc + 1;
    return acc;
  }, 0);

  // Auto-gradable count (excluye short_answer)
  const autoGradable = simulacro.questions.filter(
    (qq) => qq.kind !== "short_answer",
  ).length;

  const isRevealed = !!revealed[idx];
  const userAnswer = answers[idx];

  // Footer: botones de navegación fuera del área scrolleable
  useEffect(() => {
    if (finished) { onFooter(null); return; }
    onFooter(
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={prev} disabled={idx === 0}
          className="px-4 py-2.5 rounded-full border border-rule text-sm font-medium hover:border-ink-soft transition disabled:opacity-40">
          ← Anterior
        </button>
        {!isRevealed ? (
          <button type="button" onClick={reveal} disabled={userAnswer === undefined}
            className="px-5 py-2.5 rounded-full bg-ink text-bg text-sm font-display font-semibold hover:bg-accent transition disabled:opacity-40">
            Revisar respuesta
          </button>
        ) : (
          <button type="button" onClick={next}
            className="px-5 py-2.5 rounded-full bg-accent text-[#FBF1EF] text-sm font-display font-semibold hover:bg-accent-hover transition">
            {idx === total - 1 ? "Ver resultado →" : "Siguiente →"}
          </button>
        )}
      </div>
    );
  }, [idx, isRevealed, userAnswer, finished, total]);

  if (finished) {
    return (
      <ScoreView
        score={score}
        total={total}
        autoGradable={autoGradable}
        simulacro={simulacro}
        answers={answers}
        revealed={revealed}
        onRestart={restart}
        onJumpTo={(i) => {
          setIdx(i);
          setFinished(false);
        }}
      />
    );
  }

  if (!q) return null;

  function stateFor(isSelected: boolean, isCorrect: boolean): AnswerState {
    if (!isRevealed) return isSelected ? "selected" : "empty";
    if (isCorrect) return "correct";
    if (isSelected) return "wrong";
    return "empty";
  }

  return (
    <div>
      {/* Progress dots */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex gap-1.5 flex-1">
          {simulacro.questions.map((qq, i) => {
            const wasAnswered = answers[i] !== undefined;
            const wasRevealed = !!revealed[i];
            let color = "var(--rule)";
            if (wasRevealed) {
              const a = answers[i];
              const ok =
                (qq.kind === "multiple_choice" && a === qq.correct) ||
                (qq.kind === "true_false" && a === qq.correct);
              color =
                qq.kind === "short_answer"
                  ? "var(--info)"
                  : ok
                    ? "var(--success)"
                    : "var(--danger)";
            } else if (wasAnswered) {
              color = "var(--accent)";
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                className="h-2 flex-1 rounded-full transition"
                style={{
                  background: color,
                  opacity: i === idx ? 1 : 0.6,
                  border: i === idx ? "1px solid var(--ink)" : "none",
                }}
                aria-label={`Ir a pregunta ${i + 1}`}
                title={`Pregunta ${i + 1}`}
              />
            );
          })}
        </div>
        <span className="text-[12.5px] text-ink-soft shrink-0">
          {idx + 1} / {total}
        </span>
      </div>

      <div className="rounded-2xl border border-rule bg-paper-warm p-6 mb-4">
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-softer mb-2">
          {q.kind === "multiple_choice"
            ? "Opción múltiple"
            : q.kind === "true_false"
              ? "Verdadero / Falso"
              : "Respuesta corta"}
        </div>
        <div className="font-display font-bold text-lg mb-5 leading-snug">
          {q.question}
        </div>

        {q.kind === "multiple_choice" && (
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const isSel = userAnswer === i;
              const isCorrect = i === q.correct;
              const st = stateFor(isSel, isCorrect);
              const style = STATE_STYLE[st];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !isRevealed && answer(i)}
                  disabled={isRevealed}
                  className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition"
                  style={{
                    background: style.bg,
                    color: style.text,
                    border: `2px solid ${style.border}`,
                    cursor: isRevealed ? "default" : "pointer",
                  }}
                >
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition"
                    style={{ background: style.letterBg, color: style.letterText }}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-[14px] flex-1">{opt}</span>
                  {isRevealed && isCorrect && (
                    <span className="text-success text-[11px] font-bold uppercase tracking-[0.1em]">
                      Correcta
                    </span>
                  )}
                  {isRevealed && isSel && !isCorrect && (
                    <span className="text-danger text-[11px] font-bold uppercase tracking-[0.1em]">
                      Tu elección
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "true_false" && (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => {
              const isSel = userAnswer === v;
              const isCorrect = v === q.correct;
              const st = stateFor(isSel, isCorrect);
              const style = STATE_STYLE[st];
              return (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => !isRevealed && answer(v)}
                  disabled={isRevealed}
                  className="px-4 py-4 rounded-xl font-display font-bold text-base transition"
                  style={{
                    background: style.bg,
                    color: style.text,
                    border: `2px solid ${style.border}`,
                    cursor: isRevealed ? "default" : "pointer",
                  }}
                >
                  {v ? "Verdadero" : "Falso"}
                  {isRevealed && isCorrect && (
                    <span className="block mt-1 text-success text-[10px] font-semibold uppercase tracking-[0.1em]">
                      Correcta
                    </span>
                  )}
                  {isRevealed && isSel && !isCorrect && (
                    <span className="block mt-1 text-danger text-[10px] font-semibold uppercase tracking-[0.1em]">
                      Tu elección
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "short_answer" && (
          <div>
            <textarea
              rows={3}
              value={(userAnswer as string) ?? ""}
              onChange={(e) => answer(e.target.value)}
              disabled={isRevealed}
              placeholder="Tu respuesta…"
              className="w-full px-3 py-2.5 rounded-xl border-2 border-rule bg-paper text-sm resize-none focus:border-accent outline-none transition disabled:opacity-70"
            />
            {isRevealed && (
              <div className="mt-3 p-3 rounded-xl bg-info-soft text-[13px]">
                <strong className="text-info">Respuesta esperada · </strong>
                {q.correct}
              </div>
            )}
          </div>
        )}

        {isRevealed && (
          <div className="mt-5 pt-4 border-t border-rule-soft">
            <div className="flex items-start gap-2 text-[13px]">
              <span className="text-base shrink-0">💡</span>
              <div>
                <strong className="text-ink">Explicación:</strong>{" "}
                <span className="text-ink-soft">{q.explanation}</span>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function ScoreView({
  score,
  total,
  autoGradable,
  simulacro,
  answers,
  revealed,
  onRestart,
  onJumpTo,
}: {
  score: number;
  total: number;
  autoGradable: number;
  simulacro: SimulacroResult["simulacro"];
  answers: Record<number, unknown>;
  revealed: Record<number, boolean>;
  onRestart: () => void;
  onJumpTo: (i: number) => void;
}) {
  const pct = autoGradable === 0 ? 0 : Math.round((score / autoGradable) * 100);
  const verdict =
    pct >= 90
      ? { emoji: "🏆", label: "¡Excelente!", tone: "var(--success)" }
      : pct >= 70
        ? { emoji: "🎯", label: "Muy bien", tone: "var(--success)" }
        : pct >= 50
          ? { emoji: "💪", label: "Vas en camino", tone: "var(--warning)" }
          : { emoji: "📚", label: "A repasar", tone: "var(--accent)" };

  // Lista de incorrectas para revisar
  const incorrect: number[] = [];
  const unrevealed: number[] = [];
  simulacro.questions.forEach((qq, i) => {
    if (!revealed[i]) {
      unrevealed.push(i);
      return;
    }
    if (qq.kind === "short_answer") return;
    const a = answers[i];
    if (a !== qq.correct) incorrect.push(i);
  });

  return (
    <div>
      <div className="text-center py-6 mb-6">
        <div className="text-6xl mb-2">{verdict.emoji}</div>
        <div
          className="font-display font-extrabold text-4xl tracking-[-0.03em] mb-1"
          style={{ color: verdict.tone }}
        >
          {verdict.label}
        </div>
        <div className="font-display font-bold text-2xl mt-3 mb-1">
          <span className="text-accent num">{score}</span>
          <span className="text-ink-softer"> / {autoGradable}</span>
        </div>
        <div className="text-[12.5px] text-ink-soft">
          {pct}% de respuestas correctas
          {autoGradable < total &&
            ` · ${total - autoGradable} preguntas de desarrollo (sin auto-corrección)`}
        </div>

        <div className="mt-5 max-w-[280px] mx-auto h-2 rounded-full bg-rule-soft overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-1000"
            style={{ width: `${pct}%`, background: verdict.tone }}
          />
        </div>
      </div>

      {incorrect.length > 0 && (
        <div className="mb-6">
          <div className="eyebrow mb-3">Preguntas a repasar ({incorrect.length})</div>
          <div className="space-y-2">
            {incorrect.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => onJumpTo(i)}
                className="w-full flex items-start gap-3 px-4 py-3 rounded-xl bg-paper border border-rule-soft hover:border-danger transition text-left"
              >
                <span className="w-6 h-6 rounded-full bg-danger text-[#FBF1EF] flex items-center justify-center text-[11px] font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-[13px] flex-1">
                  {simulacro.questions[i].question}
                </span>
                <span className="text-accent text-[11px] font-semibold shrink-0">
                  Ver →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {unrevealed.length > 0 && (
        <div className="mb-6 p-3 rounded-xl bg-warning-soft border border-warning/30 text-[12.5px] text-warning">
          ⚠ Te quedaron <strong>{unrevealed.length}</strong> preguntas sin
          revisar. Volvé y revisalas para ver tu puntaje real.
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="px-6 py-2.5 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-sm hover:bg-accent-hover transition"
        >
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
