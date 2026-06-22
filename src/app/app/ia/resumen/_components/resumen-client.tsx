"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { SalePopup } from "@/components/sale-popup";

const KX_COLORS = [
  "linear-gradient(135deg,#5b8cff,#3f63ff)",
  "linear-gradient(135deg,#9a63f7,#7c3aed)",
  "linear-gradient(135deg,#ff5d79,#e4264f)",
  "linear-gradient(135deg,#ffc93c,#ffb020)",
  "linear-gradient(135deg,#34d399,#10b981)",
  "linear-gradient(135deg,#f472b6,#db2777)",
];

const PAL = ["#4f7dff","#8b5cf6","#ff6b81","#ffc93c","#34d399","#f472b6","#2dd4bf"];
const FREE_LIMIT = 3;
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

export type SummaryPoint = {
  emoji?: string;
  title: string;
  description: string;
  category?: string;
};

type SummarySection = {
  name: string;
  points: SummaryPoint[];
};

type QuizQuestion = {
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
  quizQuestions: QuizQuestion[];
  fileUrl: string | null;
};

// ---- práctica rápida ----
function PracticaQuiz({
  questions,
  topicName,
  onDone,
}: {
  questions: QuizQuestion[];
  topicName: string;
  onDone: (correct: number, total: number, rect: DOMRect) => void;
}) {
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState<Record<number, { chosen: number; correct: boolean }>>({});
  const [finished, setFinished] = useState(false);

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
      body: JSON.stringify({ title: point.title, description: point.description, category: point.category }),
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
  }, [key, point.description, point.category]);

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

// ---- sidebar de temas ----
function ResumenSidebar({
  sections,
  activeIdx,
  doneSet,
  isPro,
  totalPoints,
  fileUrl,
  onSelect,
  onLocked,
}: {
  sections: SummarySection[];
  activeIdx: number;
  doneSet: Set<number>;
  isPro: boolean;
  totalPoints: number;
  fileUrl: string | null;
  onSelect: (i: number) => void;
  onLocked: () => void;
}) {
  let globalCounter = 0;

  return (
    <aside className="rside in">
      <h2 className="po">
        Temas
        {!isPro && totalPoints > FREE_LIMIT && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginLeft: 8 }}>
            {FREE_LIMIT}/{totalPoints} 🔒
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
            const isLocked = !isPro && gIdx >= FREE_LIMIT;
            const isDone = doneSet.has(gIdx);
            const isActive = gIdx === activeIdx;
            return (
              <div
                key={pi}
                className={`t-item${isDone ? " done" : ""}${isActive ? " on" : ""}${isLocked ? " locked" : ""}`}
                onClick={() => {
                  if (isLocked) { onLocked(); return; }
                  onSelect(gIdx);
                }}
                style={isLocked ? { opacity: 0.5, cursor: "pointer" } : {}}
              >
                <span className="t-dot">
                  {isLocked ? "🔒" : (isDone ? "✓" : "")}
                </span>
                <div>
                  <div className="t-name">{pt.emoji ? `${pt.emoji} ${pt.title}` : pt.title}</div>
                  <div className="t-sub">
                    {isLocked ? "Requiere PRO" : isDone ? "Dominado · 100%" : isActive ? "En progreso" : "Sin empezar"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

// ---- componente principal ----
export function ResumenClient({ data, isPro }: { data: ResumenData; isPro: boolean }) {
  // allPoints con indices de sección para sync con espacio mapa
  const allPoints: { point: SummaryPoint; secName: string; secIdx: number; pointIdx: number }[] = [];
  data.sections.forEach((sec, si) => {
    sec.points.forEach((pt, pi) => {
      allPoints.push({ point: pt, secName: sec.name, secIdx: si, pointIdx: pi });
    });
  });

  const totalPoints = allPoints.length;
  const visiblePoints = isPro ? allPoints : allPoints.slice(0, FREE_LIMIT);
  const lockedCount = isPro ? 0 : Math.max(0, totalPoints - FREE_LIMIT);

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

  const leadNormal = point.description;
  const leadEli5 = `Pensalo así: ${point.description.split(".")[0].toLowerCase()}. ¡Más simple imposible! 🧒`;
  const leadMore = `${point.description} Profundizando un poco más: esto se relaciona directamente con ${point.category ?? "el tema"} y tiene implicaciones prácticas importantes.`;
  const currentLead = leadMode === "eli5" ? leadEli5 : leadMode === "more" ? leadMore : leadNormal;

  return (
    <>
      <div id="confetti-layer" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 80, overflow: "hidden" }} />

      {showPaywall && <SalePopup ctx="resumen" onClose={() => setShowPaywall(false)} />}

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

          <div className="ractions in" data-noprint>
            <button className="ract" onClick={() => setLeadMode("eli5")} style={leadMode === "eli5" ? { outline: "2px solid var(--violet)", outlineOffset: "1px" } : {}}>
              <span>🧒</span> Explícalo como a un niño
            </button>
            <button className="ract" onClick={() => setLeadMode("more")} style={leadMode === "more" ? { outline: "2px solid var(--violet)", outlineOffset: "1px" } : {}}>
              <span>🔬</span> Más detalles
            </button>
            {leadMode !== "normal" && (
              <button className="ract" onClick={() => setLeadMode("normal")}>Volver al original</button>
            )}
            <button className="ract" onClick={() => window.print()} style={{ marginLeft: "auto" }}>
              <span>⬇</span> Descargar PDF
            </button>
          </div>

          <div className="rcard in">
            <p className="lead" dangerouslySetInnerHTML={{ __html: currentLead }} />

            <div className="card-sec-title">
              <span className="em">📌</span> Puntos clave
            </div>
            <ul className="keylist">
              {data.sections
                .flatMap((s) => s.points)
                .slice(Math.max(0, safeActiveIdx - 1), safeActiveIdx + 3)
                .map((pt, i) => (
                  <li key={i}>
                    <span className="kx" style={{ background: KX_COLORS[i % KX_COLORS.length] }}>{i + 1}</span>
                    <div>
                      <b>{pt.title}:</b> {pt.description.split(".")[0]}.
                    </div>
                  </li>
                ))}
            </ul>

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

          {/* práctica rápida */}
          {data.quizQuestions.length > 0 && (
            <PracticaQuiz
              key={safeActiveIdx}
              questions={data.quizQuestions.slice(safeActiveIdx * 2, safeActiveIdx * 2 + 2)}
              topicName={point.title}
              onDone={handleQuizDone}
            />
          )}

          {/* nav entre temas */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, paddingBottom: 40 }}>
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
