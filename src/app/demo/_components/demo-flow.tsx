"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { completeDemo } from "@/lib/api/demo";
import { ResultModal, type AnyResult, type PuntosClaveData } from "@/app/app/ia/_components/result-modal";

// ===========================================================================
// Tipos
// ===========================================================================
type DemoProps = {
  firstName: string;
  demo: {
    title: string;
    subject: string;
    text: string;
    fileName: string;
    pdfUrl: string | null;
  };
};

type DemoQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

type GenState = "idle" | "loading" | "streaming" | "done" | "error";

const TOTAL_STEPS = 3;

// fbq helper (Meta Pixel ya está en el layout)
function fbq(...args: unknown[]) {
  const f = (window as Window & { fbq?: (...a: unknown[]) => void }).fbq;
  if (f) f(...args);
}

// Beacon de funnel — no bloquea, no rompe.
function track(event: string, step?: string, meta?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ event, step, meta });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
    }
  } catch {
    /* tracking nunca rompe */
  }
}

// ===========================================================================
// DemoFlow
// ===========================================================================
export function DemoFlow({ firstName, demo }: DemoProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Píxel de registro (acaban de registrarse) — una sola vez.
  const firedReg = useRef(false);
  useEffect(() => {
    if (firedReg.current) return;
    firedReg.current = true;
    fbq("track", "CompleteRegistration");
  }, []);

  // Instrumentación: cada vez que entran a un paso.
  useEffect(() => {
    track("demo_step_enter", `demo_${step}`);
  }, [step]);

  return (
    <div className="fixed inset-0 bg-bg text-ink flex flex-col overflow-hidden">
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, rgba(74,107,138,0.4), transparent 65%)" }}
        />
      </div>

      {/* Header fijo: logo + barra de progreso */}
      <header className="relative shrink-0 px-5 pt-5 pb-3 sm:px-8">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="font-display font-bold text-xl tracking-[-0.03em]">
              Skill<span className="text-accent">io</span>
            </span>
            <span className="text-[11px] font-semibold text-ink-soft tracking-[0.1em] uppercase">
              Paso {step} de {TOTAL_STEPS}
            </span>
          </div>
          {/* Barra de progreso de 3 segmentos */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-rule-soft overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: i < step ? "100%" : "0%",
                    background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Contenido scrolleable */}
      <main className="relative flex-1 overflow-y-auto px-5 pb-8 sm:px-8">
        <div className="max-w-xl mx-auto">
          {step === 1 && (
            <StepResumen demo={demo} onNext={() => setStep(2)} />
          )}
          {step === 2 && (
            <StepSimulacro onNext={() => setStep(3)} />
          )}
          {step === 3 && (
            <StepTuTurno
              firstName={firstName}
              onFinish={async () => {
                const { eventId } = await completeDemo();
                fbq("trackCustom", "DemoCompletado", {}, { eventID: eventId });
                router.push("/app/ia");
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

// ===========================================================================
// PASO 1 · El resumen
// ===========================================================================
const LOADING_MESSAGES = [
  "Booki está leyendo el apunte… 📖",
  "Detectando los conceptos clave… 🔍",
  "Separando lo importante de lo accesorio… ✂️",
  "Armando tus puntos clave… ✨",
  "Dándole los toques finales… 🎨",
];

function StepResumen({ demo, onNext }: { demo: DemoProps["demo"]; onNext: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [result, setResult] = useState<AnyResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const generate = useCallback(async () => {
    setState("loading");
    track("demo_generate", "demo_1", { kind: "summary" });
    try {
      const res = await fetch("/api/demo/summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.data) {
        setState("error");
        return;
      }
      setResult({ kind: "summary", format: "puntos_clave", data: data.data as PuntosClaveData });
      setState("ready");
      setModalOpen(true);
      setSeen(true);
      track("demo_generate_done", "demo_1", { kind: "summary" });
    } catch {
      setState("error");
    }
  }, []);

  return (
    <div className="animate-skillio-fade-in pt-2">
      <Eyebrow>Paso 1 · El resumen</Eyebrow>
      <h1 className="font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.1] tracking-[-0.03em] mt-2 mb-4">
        Mirá lo que Skillio hace con un apunte <span className="inline-block">🤯</span>
      </h1>

      {/* Tarjeta del apunte de ejemplo */}
      <button
        type="button"
        onClick={() => {
          if (demo.pdfUrl) {
            window.open(demo.pdfUrl, "_blank", "noopener");
          } else {
            setShowDoc(true);
          }
          track("demo_view_source", "demo_1");
        }}
        className="w-full text-left rounded-2xl border border-rule-soft bg-paper p-4 flex items-center gap-3.5 hover:border-accent/40 hover:-translate-y-[1px] hover:shadow-card transition-all duration-300 mb-5"
      >
        <span className="w-12 h-12 rounded-xl bg-accent-soft text-accent flex items-center justify-center text-xl shrink-0">
          📄
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display font-bold text-[14.5px] truncate">{demo.title}</div>
          <div className="text-[11.5px] text-ink-soft truncate">{demo.subject}</div>
        </div>
        <span className="text-[12px] text-accent font-semibold shrink-0">
          Ver apunte completo →
        </span>
      </button>

      {state === "idle" && (
        <div className="animate-demo-fade-up">
          <p className="text-[14px] text-ink-soft mb-4 text-center">
            Tocá el botón y mirá cómo la IA convierte este apunte en{" "}
            <strong className="text-ink">puntos clave</strong> en segundos.
          </p>
          <GenerateCta onClick={generate} />
        </div>
      )}

      {state === "loading" && <GeneratingPanel />}

      {state === "error" && (
        <div className="rounded-2xl border border-rule-soft bg-paper p-6 text-center">
          <p className="text-[13px] text-ink-soft mb-3">Uy, algo falló. Probá de nuevo.</p>
          <GenerateCta onClick={generate} label="Reintentar" />
        </div>
      )}

      {state === "ready" && seen && (
        <div className="animate-demo-fade-up">
          <div className="rounded-2xl border border-success/40 bg-success-soft p-4 flex items-center gap-3 mb-4">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-display font-bold text-[14px]">¡Tu resumen está listo!</div>
              <div className="text-[12px] text-ink-soft">
                Así de fácil. Lo podés ver de nuevo o descargarlo en PDF.
              </div>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex-1 py-3 rounded-full border border-rule font-display font-semibold text-[14px] text-ink hover:border-accent hover:text-accent transition"
            >
              Ver de nuevo
            </button>
            <button
              type="button"
              onClick={onNext}
              className="flex-1 py-3 rounded-full bg-ink text-bg font-display font-bold text-[14px] hover:bg-accent transition active:translate-y-[1px]"
            >
              Sigamos →
            </button>
          </div>
        </div>
      )}

      {/* Resultado idéntico a la app paga (mismo modal + PDF brandeado) */}
      {modalOpen && result && (
        <ResultModal result={result} onClose={() => setModalOpen(false)} chromeless />
      )}

      {showDoc && (
        <DocViewerModal title={demo.title} subject={demo.subject} text={demo.text} onClose={() => setShowDoc(false)} />
      )}
    </div>
  );
}

// CTA grande, atractivo y con efectos (shine + pulse + sparkles).
function GenerateCta({ onClick, label = "Generar resumen" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl py-5 text-[#FBF1EF] font-display font-extrabold text-[18px] tracking-[-0.01em] animate-demo-cta-pulse active:translate-y-[1px] transition-transform"
      style={{
        background: "linear-gradient(110deg, var(--accent) 0%, var(--accent-2) 55%, #c47b2b 100%)",
      }}
    >
      {/* Shine que barre */}
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span
          className="absolute top-0 left-0 h-full w-1/3 animate-demo-shine"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)" }}
        />
      </span>
      <span className="relative flex items-center justify-center gap-2.5">
        <span className="text-2xl animate-demo-sparkle">✨</span>
        {label}
        <span className="text-2xl animate-demo-sparkle" style={{ animationDelay: ".5s" }}>
          ✨
        </span>
      </span>
      <span className="relative block text-[11.5px] font-semibold opacity-90 mt-1">
        Gratis · no usás ninguna de tus generaciones
      </span>
    </button>
  );
}

// Panel de generación entretenido: Booki + barra indeterminada + mensajes que rotan.
function GeneratingPanel() {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-accent/20 bg-paper p-6 text-center animate-demo-fade-up relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-56 h-40 rounded-full blur-3xl opacity-40"
        style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
      />
      <div className="relative">
        <Image
          src="/booki.png"
          alt="Booki"
          width={72}
          height={72}
          className="object-contain mx-auto mb-3 animate-skillio-bob"
        />
        <div key={msgIdx} className="font-display font-bold text-[15px] mb-4 animate-demo-fade-up min-h-[22px]">
          {LOADING_MESSAGES[msgIdx]}
        </div>
        {/* Barra indeterminada */}
        <div className="h-2 rounded-full bg-rule-soft overflow-hidden relative max-w-[260px] mx-auto">
          <div
            className="absolute top-0 left-0 h-full w-1/3 rounded-full animate-demo-bar"
            style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
          />
        </div>
        <div className="text-[11px] text-ink-softer mt-3">Tarda unos segundos…</div>
      </div>
    </div>
  );
}

// ===========================================================================
// PASO 2 · El simulacro
// ===========================================================================
function StepSimulacro({ onNext }: { onNext: () => void }) {
  const [state, setState] = useState<GenState>("idle");
  const [questions, setQuestions] = useState<DemoQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const generate = useCallback(async () => {
    setState("loading");
    track("demo_generate", "demo_2", { kind: "simulacro" });
    try {
      const res = await fetch("/api/demo/simulacro", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.simulacro?.questions) {
        setState("error");
        return;
      }
      setQuestions(data.simulacro.questions as DemoQuestion[]);
      setState("done");
      track("demo_generate_done", "demo_2", { kind: "simulacro" });
    } catch {
      setState("error");
    }
  }, []);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const score = questions.reduce((acc, q, i) => (answers[i] === q.correct ? acc + 1 : acc), 0);

  return (
    <div className="animate-skillio-fade-in pt-2">
      <Eyebrow>Paso 2 · El simulacro</Eyebrow>
      <h1 className="font-display font-extrabold text-[24px] sm:text-[28px] leading-[1.12] tracking-[-0.03em] mt-2 mb-3">
        Poné a prueba lo que acabás de leer y reforzá lo aprendido
      </h1>

      {state === "idle" && (
        <>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-paper border border-rule-soft text-[12px] text-ink-soft mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> 3 preguntas · opción múltiple
          </div>
          <PrimaryButton onClick={generate}>📝 Generar simulacro</PrimaryButton>
        </>
      )}

      {state === "loading" && (
        <div className="rounded-2xl border border-rule-soft bg-paper p-5 flex items-center gap-3">
          <Spinner />
          <div className="font-display font-semibold text-sm">Armando tu simulacro…</div>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-rule-soft bg-paper p-5 text-center">
          <p className="text-[13px] text-ink-soft mb-3">Uy, algo falló. Probá de nuevo.</p>
          <PrimaryButton onClick={generate}>Reintentar</PrimaryButton>
        </div>
      )}

      {state === "done" && (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              index={i}
              question={q}
              answer={answers[i]}
              onAnswer={(opt) => {
                if (answers[i] !== undefined) return; // bloqueado tras responder
                setAnswers((a) => ({ ...a, [i]: opt }));
              }}
            />
          ))}

          {allAnswered && (
            <ScoreCard score={score} total={questions.length} onNext={onNext} />
          )}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  index,
  question,
  answer,
  onAnswer,
}: {
  index: number;
  question: DemoQuestion;
  answer: number | undefined;
  onAnswer: (opt: number) => void;
}) {
  const revealed = answer !== undefined;
  return (
    <div className="rounded-2xl border border-rule-soft bg-paper p-4 sm:p-5 animate-skillio-fade-in">
      <div className="flex items-start gap-2.5 mb-3.5">
        <span className="w-6 h-6 rounded-full bg-accent text-[#FBF1EF] flex items-center justify-center text-[12px] font-bold shrink-0 mt-0.5">
          {index + 1}
        </span>
        <div className="font-display font-bold text-[15px] leading-snug">{question.question}</div>
      </div>

      <div className="space-y-2">
        {question.options.map((opt, i) => {
          const isCorrect = i === question.correct;
          const isPicked = answer === i;
          let bg = "var(--paper)";
          let border = "var(--rule)";
          let letterBg = "var(--paper-warm)";
          let letterText = "var(--ink-soft)";
          if (revealed) {
            if (isCorrect) {
              bg = "var(--success-soft)"; border = "var(--success)";
              letterBg = "var(--success)"; letterText = "#FBF1EF";
            } else if (isPicked) {
              bg = "var(--accent-soft)"; border = "var(--danger)";
              letterBg = "var(--danger)"; letterText = "#FBF1EF";
            }
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => onAnswer(i)}
              disabled={revealed}
              className="w-full text-left px-3.5 py-3 rounded-xl flex items-center gap-3 transition"
              style={{ background: bg, border: `2px solid ${border}`, cursor: revealed ? "default" : "pointer" }}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition"
                style={{ background: letterBg, color: letterText }}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-[14px] flex-1">{opt}</span>
              {revealed && isCorrect && (
                <span className="text-success text-[10.5px] font-bold uppercase tracking-[0.1em] shrink-0">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="mt-3.5 pt-3 border-t border-rule-soft flex items-start gap-2 text-[12.5px]">
          <span className="shrink-0">💡</span>
          <span className="text-ink-soft">{question.explanation}</span>
        </div>
      )}
    </div>
  );
}

// Score card — clonado del look de la app real (verdict + barra de %).
function ScoreCard({ score, total, onNext }: { score: number; total: number; onNext: () => void }) {
  const pct = Math.round((score / total) * 100);
  const approved = score >= 2;
  const verdict = approved
    ? { emoji: "🎉", label: "¡Aprobado!", tone: "var(--success)" }
    : { emoji: "💪", label: "¡Casi! Vas en camino", tone: "var(--warning)" };

  return (
    <div className="rounded-2xl border bg-paper p-6 text-center animate-skillio-fade-in" style={{ borderColor: verdict.tone }}>
      <div className="text-5xl mb-2">{verdict.emoji}</div>
      <div className="font-display font-extrabold text-2xl tracking-[-0.02em] mb-1" style={{ color: verdict.tone }}>
        {verdict.label}
      </div>
      <div className="font-display font-bold text-3xl mt-2 mb-1">
        <span className="num" style={{ color: verdict.tone }}>{score}</span>
        <span className="text-ink-softer text-xl"> / {total}</span>
      </div>
      <div className="text-[12px] text-ink-soft mb-4">{pct}% de respuestas correctas</div>
      <div className="max-w-[220px] mx-auto h-2 rounded-full bg-rule-soft overflow-hidden mb-6">
        <div className="h-full rounded-full transition-[width] duration-1000" style={{ width: `${pct}%`, background: verdict.tone }} />
      </div>
      <ContinueButton onClick={onNext}>Último paso →</ContinueButton>
    </div>
  );
}

// ===========================================================================
// PASO 3 · Tu turno
// ===========================================================================
function StepTuTurno({ firstName, onFinish }: { firstName: string; onFinish: () => Promise<void> }) {
  const [pending, setPending] = useState(false);

  // Foto primero: en mobile nadie tiene un PDF a mano, pero todos pueden fotografiar.
  const chips = [
    { icon: "📸", label: "Foto" },
    { icon: "✍️", label: "Tema" },
    { icon: "📁", label: "Archivo" },
  ];

  return (
    <div className="animate-skillio-fade-in pt-2 text-center">
      <div className="flex justify-center mb-3">
        <Image src="/booki.png" alt="Booki" width={84} height={84} className="object-contain animate-skillio-bob" />
      </div>
      <Eyebrow center>Paso 3 · Tu turno</Eyebrow>
      <h1 className="font-display font-extrabold text-[26px] sm:text-[32px] leading-[1.08] tracking-[-0.03em] mt-2 mb-3">
        🎉 ¡Así de fácil es<br />aprobar con Skillio!
      </h1>
      <p className="text-[14px] text-ink-soft max-w-sm mx-auto mb-6">
        Ahora probá con tus propios apuntes y aprobá tus parciales, {firstName}.
      </p>

      {/* Chips de entrada */}
      <div className="flex items-center justify-center gap-2.5 mb-7">
        {chips.map((c) => (
          <div
            key={c.label}
            className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-paper border border-rule-soft min-w-[78px]"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="text-[11.5px] font-semibold text-ink-soft">{c.label}</span>
          </div>
        ))}
      </div>

      <PrimaryButton
        onClick={async () => {
          if (pending) return;
          setPending(true);
          try {
            await onFinish();
          } finally {
            setPending(false);
          }
        }}
        disabled={pending}
      >
        {pending ? "Abriendo…" : "Probar con mis apuntes →"}
      </PrimaryButton>

      <p className="text-[12px] text-ink-softer mt-5 leading-relaxed">
        💻 Probá Skillio en tu computadora<br />
        ingresando a <strong className="text-ink-soft">skillio.digital</strong>
      </p>
    </div>
  );
}

// ===========================================================================
// Visor del apunte (modal) — cuando no hay PDF real cargado
// ===========================================================================
function DocViewerModal({
  title,
  subject,
  text,
  onClose,
}: {
  title: string;
  subject: string;
  text: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
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
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-skillio-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-paper border border-rule shadow-lg flex flex-col"
        style={{ maxHeight: "calc(100dvh - 60px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-rule-soft shrink-0">
          <div className="min-w-0 mr-2 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-accent-soft text-accent flex items-center justify-center text-base shrink-0">📄</span>
            <div className="min-w-0">
              <div className="font-display font-bold text-[14px] truncate">{title}</div>
              <div className="text-[11px] text-ink-soft truncate">{subject}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full border border-rule hover:border-ink-soft transition flex items-center justify-center text-lg shrink-0"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5" style={{ overscrollBehavior: "contain" }}>
          <div className="whitespace-pre-wrap font-sans text-[13.5px] leading-[1.7] text-ink">{text}</div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Primitivos de UI
// ===========================================================================
function Eyebrow({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase text-accent"
      style={center ? { justifyContent: "center" } : undefined}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3.5 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[15px] hover:bg-accent-hover transition shadow-[0_10px_28px_var(--accent-glow)] active:translate-y-[1px] disabled:opacity-60 disabled:cursor-wait"
    >
      {children}
    </button>
  );
}

function ContinueButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-3.5 rounded-full bg-ink text-bg font-display font-bold text-[15px] hover:bg-accent transition active:translate-y-[1px]"
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div className="relative w-5 h-5 shrink-0">
      <span className="w-5 h-5 rounded-full bg-accent animate-ping absolute opacity-40" />
      <span className="w-5 h-5 rounded-full bg-accent relative flex" />
    </div>
  );
}
