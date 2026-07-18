"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { SalePopup } from "@/components/sale-popup";
import { RescuePrompt } from "@/components/rescue-prompt";
import { OnboardingTour, useTourRequired, TourIconBook } from "../../../_components/onboarding-tour";

const KX_COLORS = [
  "linear-gradient(135deg,#5b8cff,#3f63ff)",
  "linear-gradient(135deg,#9a63f7,#7c3aed)",
  "linear-gradient(135deg,#ff5d79,#e4264f)",
  "linear-gradient(135deg,#ffc93c,#ffb020)",
  "linear-gradient(135deg,#34d399,#10b981)",
  "linear-gradient(135deg,#f472b6,#db2777)",
];

const PAL = ["#4f7dff","#8b5cf6","#ff6b81","#ffc93c","#34d399","#f472b6","#2dd4bf"];
const FREE_LIMIT = 2;               // puntos reales visibles para free
const LOCKED_PLACEHOLDERS = 6;      // slots bloqueados (sin título) que se muestran debajo
const ESPACIO_KEY = "skillio_tema_";

function confettiBurst(x: number, y: number) {
  const lay = document.getElementById("confetti-layer");
  if (!lay) return;
  for (let i = 0; i < 32; i++) {
    const p = document.createElement("span");
    p.style.cssText = `position:absolute;width:9px;height:14px;border-radius:2px;left:${x}px;top:${y}px;background:${PAL[i % PAL.length]};--dx:${Math.random() * 220 - 110}px;transform:rotate(${Math.random() * 360}deg);animation:cftFall ${0.8 + Math.random() * 0.7}s ease-out forwards`;
    lay.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}

// Formato viejo (y el que sigue usando free): un párrafo + nada más. Sigue
// existiendo para no romper resúmenes ya generados ni el free (alcance actual:
// solo pro tiene los bloques dinámicos de abajo).
type LegacyPoint = { emoji?: string; title: string; description: string; category?: string };

// Bloques dinámicos de pro: la IA elige, por bloque, el formato que mejor
// comunique ESE contenido puntual — no todo es "texto + lista".
type TextoBlock = { type: "texto"; emoji?: string; title: string; category?: string; body: string };
type ProcesoBlock = {
  type: "proceso"; emoji?: string; title: string; category?: string; intro?: string;
  pasos: { paso: string; detalle: string }[];
};
type TablaBlock = {
  type: "tabla"; emoji?: string; title: string; category?: string; intro?: string;
  columnas: string[]; filas: { etiqueta: string; valores: string[] }[];
};
type FrameworkBlock = {
  type: "framework"; emoji?: string; title: string; category?: string; intro?: string;
  elementos: { nombre: string; descripcion: string }[];
};
type AnalogiaBlock = { type: "analogia"; emoji?: string; title: string; category?: string; analogia: string; conexion: string };

export type SummaryPoint = LegacyPoint | TextoBlock | ProcesoBlock | TablaBlock | FrameworkBlock | AnalogiaBlock;

type BlockKind = "legacy" | "texto" | "proceso" | "tabla" | "framework" | "analogia";
function blockKind(p: SummaryPoint): BlockKind {
  return "type" in p ? p.type : "legacy";
}

// Versión en texto plano de cualquier bloque — para el tip de Booki, la
// práctica rápida y el modo "explicalo como a un niño" (no necesitan la
// estructura, solo el contenido).
export function plainText(p: SummaryPoint): string {
  switch (blockKind(p)) {
    case "legacy": return (p as LegacyPoint).description;
    case "texto": return (p as TextoBlock).body;
    case "proceso": {
      const b = p as ProcesoBlock;
      return [b.intro, ...b.pasos.map((s, i) => `${i + 1}. ${s.paso}: ${s.detalle}`)].filter(Boolean).join(" ");
    }
    case "tabla": {
      const b = p as TablaBlock;
      return [b.intro, ...b.filas.map((f) => `${f.etiqueta}: ${f.valores.join(", ")}`)].filter(Boolean).join(" ");
    }
    case "framework": {
      const b = p as FrameworkBlock;
      return [b.intro, ...b.elementos.map((e) => `${e.nombre}: ${e.descripcion}`)].filter(Boolean).join(" ");
    }
    case "analogia": {
      const b = p as AnalogiaBlock;
      return `${b.analogia} ${b.conexion}`;
    }
  }
}

type SummarySection = {
  name: string;
  points: SummaryPoint[];
};

export type QuizQuestion = {
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion?: string;
};

export type ResumenData = {
  noteId: string;
  noteTitle: string;
  subjectName: string;
  intro: string;
  sections: SummarySection[];
  fileUrl: string | null;
};

// ---- práctica rápida ----
function PracticaQuiz({
  point,
  topicName,
  onDone,
  demoPool,
  poolSeed = 0,
}: {
  point: SummaryPoint;
  topicName: string;
  onDone: (correct: number, total: number, rect: DOMRect) => void;
  // Demo: en vez de generar con IA, usamos un pool fijo (del simulacro del demo)
  // y simulamos la carga para que "parezca que se genera".
  demoPool?: QuizQuestion[];
  poolSeed?: number;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQ, setLoadingQ] = useState(true);
  const cacheRef = useRef<Map<string, QuizQuestion[]>>(new Map());
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState<Record<number, { chosen: number; correct: boolean }>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const key = point.title;
    if (cacheRef.current.has(key)) {
      setQuestions(cacheRef.current.get(key)!);
      setLoadingQ(false);
      setCurrent(0);
      setAnswered({});
      setFinished(false);
      return;
    }
    setLoadingQ(true);
    setQuestions([]);
    setCurrent(0);
    setAnswered({});
    setFinished(false);

    // DEMO: pool fijo, sin IA, con un delay para simular la generación.
    if (demoPool && demoPool.length > 0) {
      const n = demoPool.length;
      const picked = [demoPool[(poolSeed * 2) % n], demoPool[(poolSeed * 2 + 1) % n]];
      const t = setTimeout(() => {
        cacheRef.current.set(key, picked);
        setQuestions(picked);
        setLoadingQ(false);
      }, 1300 + Math.random() * 600);
      return () => clearTimeout(t);
    }

    fetch("/api/ai/practica-rapida", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: point.title, description: plainText(point), category: point.category }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.questions) {
          cacheRef.current.set(key, d.questions);
          setQuestions(d.questions);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingQ(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [point.title, point.category]);

  if (loadingQ) return (
    <div className="practica in" style={{ minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <span className="btyping"><span /><span /><span /></span>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>Generando preguntas sobre este tema…</span>
    </div>
  );

  if (questions.length === 0) return null;
  const q = questions[current];
  const ans = answered[current];
  const locked = ans !== undefined;

  function choose(idx: number) {
    if (locked) return;
    const correct = idx === q.correcta;
    setAnswered((prev) => ({ ...prev, [current]: { chosen: idx, correct } }));
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    }
  }

  function handleFinish(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const aciertos = Object.values(answered).filter((a) => a.correct).length;
    confettiBurst(rect.left + 24, rect.top + 12);
    setFinished(true);
    onDone(aciertos, questions.length, rect);
  }

  const aciertos = Object.values(answered).filter((a) => a.correct).length;
  const allAnswered = Object.keys(answered).length === questions.length;

  if (finished) {
    const pct = Math.round((aciertos / questions.length) * 100);
    const perfect = aciertos === questions.length;
    return (
      <div className="practica in">
        <div className="done-banner show" style={{
          background: perfect
            ? "linear-gradient(135deg,rgba(16,185,129,.12),rgba(52,211,153,.08))"
            : "linear-gradient(135deg,rgba(79,125,255,.10),rgba(139,92,246,.08))",
          border: `1.5px solid ${perfect ? "rgba(16,185,129,.3)" : "rgba(79,125,255,.25)"}`,
          borderRadius: 18, padding: "20px 22px",
          display: "flex", gap: 16, alignItems: "center",
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
            background: perfect ? "linear-gradient(135deg,#10b981,#34d399)" : "linear-gradient(135deg,#4f7dff,#8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
          }}>
            {perfect ? "🏆" : pct >= 50 ? "💪" : "📖"}
          </div>
          <div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
              {perfect ? "¡Tema dominado! 🎉" : `${aciertos} de ${questions.length} correctas`}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
              {perfect
                ? `${topicName} pasó a 100% de dominio. ¡Seguí así!`
                : pct >= 50
                  ? `Vas bien. Repasá ${topicName} y volvé a intentarlo.`
                  : `Prestá más atención a ${topicName} antes de seguir.`}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {questions.map((_, qi) => (
                <span key={qi} style={{
                  width: 30, height: 30, borderRadius: 8, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700,
                  background: answered[qi]?.correct ? "rgba(16,185,129,.15)" : "rgba(255,91,113,.15)",
                  color: answered[qi]?.correct ? "#10b981" : "#ff5b71",
                }}>
                  {answered[qi]?.correct ? "✓" : "✕"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="practica in">
      <div className="pph">
        <span className="ppbadge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 2 2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21 8 13.9 2 9.3h7.6z" />
          </svg>
        </span>
        <h3>Práctica rápida</h3>
        <span className="pqn">{questions.length} preguntas</span>
      </div>
      <p className="psub">
        Respondé para fijar el tema. Si acertás todas, marcamos <b>{topicName}</b> como dominado. 🎯
      </p>

      <div className="pq">
        <div className="pqt">
          <span className="pqnum">{current + 1}</span>
          {q.pregunta}
        </div>
        <div className="popts">
          {q.opciones.map((opt, i) => {
            let cls = "popt";
            if (locked) {
              cls += " locked";
              if (i === q.correcta) cls += " correct";
              else if (ans.chosen === i) cls += " wrong";
            }
            return (
              <button key={i} className={cls} onClick={() => choose(i)}>
                <span className="mk">
                  {locked && i === q.correcta && "✓"}
                  {locked && ans.chosen === i && i !== q.correcta && "✕"}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        {locked && q.explicacion && (
          <div className="pexp show">
            <b>{ans.correct ? "Correcto:" : "Incorrecto:"}</b> {q.explicacion}
          </div>
        )}
        {locked && (
          <div className="pqnext show">
            {!allAnswered ? (
              <button className="nbtn" onClick={next}>Siguiente →</button>
            ) : (
              <button className="nbtn" onClick={handleFinish}>
                Ver resultado 🎉
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- booki tip con llamada AI ----
function BookiTip({ point }: { point: SummaryPoint }) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const key = point.title;

  useEffect(() => {
    if (cacheRef.current.has(key)) {
      setTip(cacheRef.current.get(key)!);
      return;
    }
    setTip(null);
    setLoading(true);
    fetch("/api/ai/booki-tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: point.title, description: plainText(point), category: point.category }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.tip) {
          cacheRef.current.set(key, d.tip);
          setTip(d.tip);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, point.category]);

  return (
    <div className="booki-tip">
      <span className="bav">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
          <circle cx="9" cy="11" r="1.6" />
          <circle cx="15" cy="11" r="1.6" />
          <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6l-3 3v-3H5a1 1 0 0 1-1-1Z" fill="none" stroke="#fff" strokeWidth="1.6" />
        </svg>
      </span>
      <div className="btx">
        <b>Tip de Booki:</b>{" "}
        {loading ? (
          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>Generando tip mnemotécnico…</span>
        ) : tip ? (
          tip
        ) : (
          `Para recordar mejor "${point.title}", relacionalo con algo que ya sabés. 💡`
        )}
      </div>
    </div>
  );
}

// ---- contenido del bloque activo, según su tipo ----
function BlockContent({ point, leadMode }: { point: SummaryPoint; leadMode: "normal" | "eli5" | "more" }) {
  const kind = blockKind(point);

  if (kind === "legacy" || kind === "texto") {
    const base = kind === "legacy" ? (point as LegacyPoint).description : (point as TextoBlock).body;
    const text =
      leadMode === "eli5"
        ? `Pensalo así: ${base.split(".")[0].toLowerCase()}. ¡Más simple imposible! 🧒`
        : leadMode === "more"
          ? `${base} Profundizando un poco más: esto se relaciona directamente con ${point.category ?? "el tema"} y tiene implicaciones prácticas importantes.`
          : base;
    return <p className="lead" style={{ whiteSpace: "pre-wrap" }}>{text}</p>;
  }

  if (kind === "proceso") {
    const b = point as ProcesoBlock;
    return (
      <div className="lead">
        {b.intro && <p style={{ marginBottom: 14 }}>{b.intro}</p>}
        <ol style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 0, listStyle: "none", margin: 0 }}>
          {b.pasos.map((s, i) => (
            <li key={i} style={{ display: "flex", gap: 12 }}>
              <span style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: "50%",
                background: KX_COLORS[i % KX_COLORS.length], color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
              }}>{i + 1}</span>
              <div><b>{s.paso}:</b> {s.detalle}</div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (kind === "tabla") {
    const b = point as TablaBlock;
    return (
      <div className="lead">
        {b.intro && <p style={{ marginBottom: 14 }}>{b.intro}</p>}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid var(--rule)" }} />
                {b.columnas.map((c, i) => (
                  <th key={i} style={{ textAlign: "left", padding: "8px 12px", borderBottom: "2px solid var(--rule)", fontWeight: 700 }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.filas.map((f, i) => (
                <tr key={i}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, borderBottom: "1px solid var(--rule)" }}>{f.etiqueta}</td>
                  {f.valores.map((v, j) => (
                    <td key={j} style={{ padding: "8px 12px", borderBottom: "1px solid var(--rule)" }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (kind === "framework") {
    const b = point as FrameworkBlock;
    return (
      <div className="lead">
        {b.intro && <p style={{ marginBottom: 14 }}>{b.intro}</p>}
        <div style={{ display: "grid", gap: 10 }}>
          {b.elementos.map((el, i) => (
            <div key={i} style={{
              display: "flex", gap: 12, padding: "10px 14px", borderRadius: 12,
              background: "rgba(139,92,246,.06)", border: "1px solid rgba(139,92,246,.15)",
            }}>
              <span style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                background: KX_COLORS[i % KX_COLORS.length], color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
              }}>{i + 1}</span>
              <div><b>{el.nombre}:</b> {el.descripcion}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // analogia
  const b = point as AnalogiaBlock;
  return (
    <div className="lead">
      <div style={{
        padding: "16px 18px", borderRadius: 16, marginBottom: 14,
        background: "linear-gradient(135deg,rgba(255,201,60,.1),rgba(255,176,32,.06))",
        border: "1.5px solid rgba(255,176,32,.28)",
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13, color: "#b8860b" }}>💡 Para entenderlo mejor</div>
        {b.analogia}
      </div>
      <p style={{ margin: 0 }}>{b.conexion}</p>
    </div>
  );
}

// ---- sidebar de temas ----
function ResumenSidebar({
  sections,
  activeIdx,
  doneSet,
  isPro,
  totalPoints,
  lockedPlaceholders,
  fileUrl,
  onSelect,
  onLocked,
}: {
  sections: SummarySection[];
  activeIdx: number;
  doneSet: Set<number>;
  isPro: boolean;
  totalPoints: number;
  lockedPlaceholders: number;
  fileUrl: string | null;
  onSelect: (i: number) => void;
  onLocked: () => void;
}) {
  let globalCounter = 0;
  const visibleReal = isPro ? totalPoints : Math.min(totalPoints, FREE_LIMIT);

  return (
    <aside className="rside in">
      <style>{`
        @keyframes lockShimmer {
          0%   { background-position: -250% center; }
          100% { background-position: 250% center; }
        }
        @keyframes lockPulse {
          0%, 100% { box-shadow: 0 0 0px rgba(150,85,229,0), inset 0 0 0px rgba(150,85,229,0); }
          50%       { box-shadow: 0 0 14px rgba(150,85,229,.35), inset 0 0 8px rgba(150,85,229,.08); }
        }
        @keyframes lockIconBounce {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-3px) scale(1.15); }
        }
        .t-item-locked {
          cursor: pointer;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,.55) 0%, rgba(240,235,255,.45) 100%);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(150,85,229,.18) !important;
          animation: lockPulse 2.6s ease-in-out infinite;
          transition: transform .15s;
        }
        .t-item-locked:hover {
          transform: translateY(-1px);
          border-color: rgba(150,85,229,.4) !important;
        }
        .t-item-locked .t-name {
          background: linear-gradient(90deg, #1f2347 15%, #9655E5 35%, #c084fc 50%, #9655E5 65%, #1f2347 85%);
          background-size: 250% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: lockShimmer 2.8s linear infinite;
          font-weight: 700 !important;
        }
        .t-item-locked .lock-icon {
          animation: lockIconBounce 2.2s ease-in-out infinite;
          display: inline-block;
          font-size: 13px;
        }
      `}</style>

      <h2 className="po">
        Temas
        {!isPro && lockedPlaceholders > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginLeft: 8 }}>
            {visibleReal}/{visibleReal + lockedPlaceholders} 🔒
          </span>
        )}
      </h2>
      {fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-full" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          Apunte original
        </a>
      ) : (
        <button className="btn-full" style={{ opacity: 0.5, cursor: "default" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          Resumen completo
        </button>
      )}
      {sections.map((sec, si) => (
        <div key={si}>
          {sec.name !== sections[si - 1]?.name && (
            <div className="slabel">{sec.name}</div>
          )}
          {sec.points.map((pt, pi) => {
            const gIdx = globalCounter++;
            // Free: los puntos más allá del límite NO se renderizan como reales
            // (no tienen contenido generado); van como slots bloqueados abajo.
            if (!isPro && gIdx >= FREE_LIMIT) return null;
            const isDone = doneSet.has(gIdx);
            const isActive = gIdx === activeIdx;
            return (
              <div
                key={pi}
                className={`t-item${isDone ? " done" : ""}${isActive ? " on" : ""}`}
                onClick={() => onSelect(gIdx)}
              >
                <span className="t-dot">{isDone ? "✓" : ""}</span>
                <div>
                  <div className="t-name">{pt.emoji ? `${pt.emoji} ${pt.title}` : pt.title}</div>
                  <div className="t-sub">
                    {isDone ? "Dominado · 100%" : isActive ? "En progreso" : "Sin empezar"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Free: slots bloqueados SIN título (contenido no generado, desbloqueá con PRO) */}
      {!isPro && lockedPlaceholders > 0 && (
        <div>
          <div className="slabel">Más contenido</div>
          {Array.from({ length: lockedPlaceholders }).map((_, i) => (
            <div key={`lk-${i}`} className="t-item t-item-locked" onClick={onLocked}>
              <span className="t-dot"><span className="lock-icon">🔒</span></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  aria-hidden
                  style={{
                    height: 9,
                    width: `${72 - i * 6}%`,
                    minWidth: 88,
                    borderRadius: 6,
                    marginBottom: 7,
                    background: "linear-gradient(90deg, rgba(150,85,229,.22) 15%, rgba(192,132,252,.5) 50%, rgba(150,85,229,.22) 85%)",
                    backgroundSize: "250% auto",
                    animation: "lockShimmer 2.8s linear infinite",
                  }}
                />
                <div className="t-sub" style={{ color: "#9655E5", fontWeight: 600, fontSize: 11 }}>
                  ✨ Desbloqueá con PRO
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

// ---- componente principal ----
export function ResumenClient({
  data,
  isPro,
  isDemo = false,
  isGuest = false,
  demoPractica,
}: {
  data: ResumenData;
  isPro: boolean;
  isDemo?: boolean;
  isGuest?: boolean;
  // Demo: pool fijo de preguntas para la práctica rápida (sin IA).
  demoPractica?: QuizQuestion[];
}) {
  // allPoints con indices de sección para sync con espacio mapa
  const allPoints: { point: SummaryPoint; secName: string; secIdx: number; pointIdx: number }[] = [];
  data.sections.forEach((sec, si) => {
    sec.points.forEach((pt, pi) => {
      allPoints.push({ point: pt, secName: sec.name, secIdx: si, pointIdx: pi });
    });
  });

  const totalPoints = allPoints.length;
  const visiblePoints = isPro ? allPoints : allPoints.slice(0, FREE_LIMIT);
  // Free: el resumen se genera con solo 2 puntos reales (5 págs de input). El
  // resto se muestra como slots bloqueados SIN título (no fueron generados por
  // la IA). Cantidad decorativa fija para transmitir "hay mucho más con PRO".
  const lockedCount: number = isPro ? 0 : LOCKED_PLACEHOLDERS;

  const DONE_KEY = `skillio_resumen_done_${data.noteId}`;

  const [activeIdx, setActiveIdx] = useState(0);
  const [doneSet, setDoneSet] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    try {
      const saved = localStorage.getItem(DONE_KEY);
      return saved ? new Set<number>(JSON.parse(saved) as number[]) : new Set<number>();
    } catch { return new Set<number>(); }
  });
  const [leadMode, setLeadMode] = useState<"normal" | "eli5" | "more">("normal");
  const [showPaywall, setShowPaywall] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueDone, setRescueDone] = useState(false);
  const showResumenTour = useTourRequired("skillio_resumen_tour_v1");

  // Al cerrar el paywall sin pagar, invitados: ofrecemos el rescate por mail
  // (una sola vez).
  function closePaywall() {
    setShowPaywall(false);
    if (isGuest && !rescueDone) setRescueOpen(true);
  }

  const safeActiveIdx = Math.min(activeIdx, visiblePoints.length - 1);
  const active = visiblePoints[safeActiveIdx];

  const doneCount = doneSet.size;

  // Persiste en localStorage (resumen progress + espacio mapa sync)
  function persistDone(newSet: Set<number>) {
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify([...newSet]));
    } catch { /* noop */ }
  }

  function markTopicDoneInEspacio(gIdx: number) {
    const ap = allPoints[gIdx];
    if (!ap) return;
    localStorage.setItem(`${ESPACIO_KEY}topic-${ap.secIdx}-${ap.pointIdx}`, "100");
  }

  const handleQuizDone = useCallback((correct: number, total: number, _rect: DOMRect) => {
    if (correct === total) {
      setDoneSet((prev) => {
        const next = new Set([...prev, safeActiveIdx]);
        persistDone(next);
        return next;
      });
      markTopicDoneInEspacio(safeActiveIdx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeActiveIdx]);

  function markDone() {
    setDoneSet((prev) => {
      const next = new Set([...prev, safeActiveIdx]);
      persistDone(next);
      return next;
    });
    markTopicDoneInEspacio(safeActiveIdx);
    if (safeActiveIdx < visiblePoints.length - 1) setActiveIdx((i) => i + 1);
  }

  function handleSelect(i: number) {
    if (!isPro && i >= FREE_LIMIT) { setShowPaywall(true); return; }
    setActiveIdx(i);
    setLeadMode("normal");
  }

  if (!active) return <div style={{ padding: 40, color: "var(--muted)" }}>Sin contenido generado aún.</div>;

  const { point, secName, pointIdx } = active;
  const canSimplify = blockKind(point) === "legacy" || blockKind(point) === "texto";

  return (
    <>
      <div id="confetti-layer" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 80, overflow: "hidden" }} />

      {showPaywall && <SalePopup ctx="resumen" onClose={closePaywall} />}
      {rescueOpen && !rescueDone && (
        <RescuePrompt
          noteId={data.noteId}
          onClose={() => setRescueOpen(false)}
          onDone={() => {
            setRescueDone(true);
            setRescueOpen(false);
          }}
        />
      )}

      {showResumenTour && (
        <OnboardingTour
          storageKey="skillio_resumen_tour_v1"
          steps={[
            {
              icon: <TourIconBook />,
              title: "Navegá entre temas",
              body: "Tocá cualquier tema de la lista para saltar entre ellos. Los que domines quedan marcados en verde.",
              target: ".rside",
              placement: "right",
              nextLabel: "Entendido ›",
            },
            {
              icon: <TourIconBook />,
              title: "Seguí estudiando",
              body: "Cuando termines el resumen, reforzá con las Tarjetas o poné a prueba lo aprendido con el Simulacro.",
              target: '[data-tour="mode-nav"]',
              placement: "top",
              nextLabel: "¡Listo, a estudiar!",
            },
          ]}
        />
      )}

      {/* banner demo */}
      {isDemo && (
        <div style={{
          background: "linear-gradient(90deg,#7c3aed,#4f7dff)",
          color: "#fff", padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap", fontSize: 13,
        }}>
          <span>✨ Estás viendo una demo — subí tu propio apunte para generar tu set de estudio.</span>
          <Link href={isGuest ? "/app?upload=1" : "/app/materias"} style={{
            background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)",
            color: "#fff", padding: "6px 14px", borderRadius: 10,
            fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
          }}>
            Subir mi apunte →
          </Link>
        </div>
      )}

      {/* topbar */}
      <div className="rtopbar">
        <Link href={`/app/ia?note_id=${data.noteId}`} className="back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Volver
        </Link>
        <div className="crumb-r">{data.subjectName} · <b>Resumen</b></div>
        <div className="rfiles">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {doneCount}/{visiblePoints.length}{!isPro && lockedCount > 0 ? ` · 🔒 ${lockedCount}` : ""} dominados
        </div>
      </div>

      <div className="rwrap">
        {/* sidebar */}
        <ResumenSidebar
          sections={data.sections}
          activeIdx={safeActiveIdx}
          doneSet={doneSet}
          isPro={isPro}
          totalPoints={totalPoints}
          lockedPlaceholders={lockedCount}
          fileUrl={data.fileUrl}
          onSelect={handleSelect}
          onLocked={() => setShowPaywall(true)}
        />

        {/* reader */}
        <main className="reader-main">
          {/* Header visible solo al imprimir */}
          <div className="print-header">
            <span className="phlogo">Skillio</span>
            <span className="phtag">{data.subjectName} · {data.noteTitle}</span>
          </div>

          <div className="rhead in">
            <div className="sec-eyebrow">
              {secName} · Tema {pointIdx + 1}
            </div>
            <h1 className="rtitle">{point.emoji ? `${point.emoji} ${point.title}` : point.title}</h1>
            <div className="rmeta">
              <span className="rpill prog">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                </svg>
                {doneSet.has(safeActiveIdx) ? "Dominado · 100%" : "En progreso"}
              </span>
              <span className="rpill amber">⏱ 2 min de lectura</span>
            </div>
          </div>

          {/* Modos (Tarjetas / Simulacro) — arriba, debajo del título */}
          <div data-tour="mode-nav" style={{ display: "flex", gap: 10, margin: "0 0 20px", flexWrap: "wrap" }}>
            <Link href={`/app/ia/tarjetas?note_id=${data.noteId}`} style={{
              flex: 1, minWidth: 130,
              padding: "12px 16px", borderRadius: 14,
              background: "linear-gradient(135deg,#8b5cf6,#7c3aed)",
              color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
              display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              textDecoration: "none", boxShadow: "0 6px 18px rgba(124,58,237,.28)",
            }}>
              🃏 Ir a Tarjetas
            </Link>
            <Link href={`/app/ia/simulacro?note_id=${data.noteId}`} style={{
              flex: 1, minWidth: 130,
              padding: "12px 16px", borderRadius: 14,
              background: "linear-gradient(135deg,#ff5d79,#e4264f)",
              color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
              display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
              textDecoration: "none", boxShadow: "0 6px 18px rgba(255,93,121,.28)",
            }}>
              📝 Hacer Simulacro
            </Link>
          </div>

          <div className="ractions in" data-noprint>
            {canSimplify && (
              <>
                <button className="ract" onClick={() => setLeadMode("eli5")} style={leadMode === "eli5" ? { outline: "2px solid var(--violet)", outlineOffset: "1px" } : {}}>
                  <span>🧒</span> Explícalo como a un niño
                </button>
                <button className="ract" onClick={() => setLeadMode("more")} style={leadMode === "more" ? { outline: "2px solid var(--violet)", outlineOffset: "1px" } : {}}>
                  <span>🔬</span> Más detalles
                </button>
                {leadMode !== "normal" && (
                  <button className="ract" onClick={() => setLeadMode("normal")}>Volver al original</button>
                )}
              </>
            )}
            <button className="ract" onClick={() => window.print()} style={{ marginLeft: "auto" }}>
              <span>⬇</span> Descargar PDF
            </button>
          </div>

          <div className="rcard in">
            <BlockContent point={point} leadMode={leadMode} />

            <BookiTip point={point} />

            {/* upgrade CTA inline si hay temas bloqueados */}
            {!isPro && lockedCount > 0 && safeActiveIdx === visiblePoints.length - 1 && (
              <div style={{
                marginTop: 24,
                background: "linear-gradient(135deg,rgba(139,92,246,.07),rgba(79,125,255,.07))",
                border: "1.5px solid rgba(139,92,246,.2)",
                borderRadius: 18, padding: "18px",
              }}>
                <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  🔒 {lockedCount} punto{lockedCount !== 1 ? "s" : ""} clave más esperan
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                  Este es el último tema del plan gratuito. Desbloqueá el resumen completo para dominar el apunte entero.
                </div>
                <button
                  onClick={() => setShowPaywall(true)}
                  style={{
                    width: "100%", padding: "12px",
                    background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                    color: "#fff", border: "none", borderRadius: 13,
                    fontFamily: "var(--po)", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", boxShadow: "0 8px 20px rgba(99,38,210,.22)",
                  }}
                >
                  ⚡ Desbloquear resumen completo
                </button>
              </div>
            )}
          </div>

          {/* práctica rápida — preguntas generadas dinámicamente por tema (demo: pool fijo) */}
          <PracticaQuiz
            key={`${data.noteId}-${safeActiveIdx}`}
            point={point}
            topicName={point.title}
            onDone={handleQuizDone}
            demoPool={demoPractica}
            poolSeed={safeActiveIdx}
          />

          {/* nav entre temas */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {safeActiveIdx > 0 && (
              <button className="nbtn ghost" onClick={() => setActiveIdx((i) => i - 1)}>
                ← Anterior
              </button>
            )}
            {!doneSet.has(safeActiveIdx) && (
              <button className="nbtn" onClick={markDone}>
                Marcar como dominado ✓
              </button>
            )}
            {safeActiveIdx < visiblePoints.length - 1 ? (
              <button className="nbtn" onClick={() => setActiveIdx((i) => i + 1)} style={{ marginLeft: "auto" }}>
                Siguiente tema →
              </button>
            ) : !isPro && lockedCount > 0 ? (
              <button
                className="nbtn"
                onClick={() => setShowPaywall(true)}
                style={{
                  marginLeft: "auto",
                  background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                }}
              >
                🔒 Siguiente tema →
              </button>
            ) : null}
          </div>

        </main>
      </div>
    </>
  );
}
