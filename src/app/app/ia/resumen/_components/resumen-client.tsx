"use client";

import { useState, useCallback } from "react";
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
};

// ---- práctica rápida ----
function PracticaQuiz({
  questions,
  topicName,
  onDone,
}: {
  questions: QuizQuestion[];
  topicName: string;
  onDone: (rect: DOMRect) => void;
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
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else setFinished(true);
  }

  function handleFinish(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    confettiBurst(rect.left + 24, rect.top + 12);
    onDone(rect);
  }

  const aciertos = Object.values(answered).filter((a) => a.correct).length;

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

      {!finished ? (
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
              {current < questions.length - 1 ? (
                <button className="nbtn" onClick={next}>Siguiente →</button>
              ) : (
                <button className="nbtn" onClick={handleFinish}>
                  Ver resultado 🎉
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="done-banner show">
          <span className="dem">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <div>
            <h4>¡{aciertos === questions.length ? "Tema dominado! 🎉" : `${aciertos}/${questions.length} correctas`}</h4>
            <p>{topicName} — {aciertos === questions.length ? "pasó a 100%. Tu dominio subió." : "Seguí repasando para dominarlo."}</p>
          </div>
        </div>
      )}
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
  onSelect,
  onLocked,
}: {
  sections: SummarySection[];
  activeIdx: number;
  doneSet: Set<number>;
  isPro: boolean;
  totalPoints: number;
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
      <button className="btn-full">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
        Resumen completo
      </button>
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
  const allPoints: { point: SummaryPoint; secName: string; localIdx: number }[] = [];
  data.sections.forEach((sec) => {
    sec.points.forEach((pt, i) => {
      allPoints.push({ point: pt, secName: sec.name, localIdx: i });
    });
  });

  const totalPoints = allPoints.length;
  const visiblePoints = isPro ? allPoints : allPoints.slice(0, FREE_LIMIT);
  const lockedCount = isPro ? 0 : Math.max(0, totalPoints - FREE_LIMIT);

  const [activeIdx, setActiveIdx] = useState(0);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());
  const [leadMode, setLeadMode] = useState<"normal" | "eli5" | "more">("normal");
  const [showPaywall, setShowPaywall] = useState(false);

  const safeActiveIdx = Math.min(activeIdx, visiblePoints.length - 1);
  const active = visiblePoints[safeActiveIdx];

  const doneCount = doneSet.size;

  const handleQuizDone = useCallback((_rect: DOMRect) => {
    setDoneSet((prev) => new Set([...prev, safeActiveIdx]));
  }, [safeActiveIdx]);

  function markDone() {
    setDoneSet((prev) => new Set([...prev, safeActiveIdx]));
    if (safeActiveIdx < visiblePoints.length - 1) setActiveIdx((i) => i + 1);
  }

  function handleSelect(i: number) {
    if (!isPro && i >= FREE_LIMIT) { setShowPaywall(true); return; }
    setActiveIdx(i);
    setLeadMode("normal");
  }

  if (!active) return <div style={{ padding: 40, color: "var(--muted)" }}>Sin contenido generado aún.</div>;

  const { point, secName, localIdx } = active;

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
          onSelect={handleSelect}
          onLocked={() => setShowPaywall(true)}
        />

        {/* reader */}
        <main className="reader-main">
          <div className="rhead in">
            <div className="sec-eyebrow">
              {secName} · Tema {localIdx + 1}
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

          <div className="ractions in">
            <button className="ract" onClick={() => setLeadMode("eli5")} style={leadMode === "eli5" ? { outline: "2px solid var(--violet)", outlineOffset: "1px" } : {}}>
              <span>🧒</span> Explícalo como a un niño
            </button>
            <button className="ract" onClick={() => setLeadMode("more")} style={leadMode === "more" ? { outline: "2px solid var(--violet)", outlineOffset: "1px" } : {}}>
              <span>🔬</span> Más detalles
            </button>
            {leadMode !== "normal" && (
              <button className="ract" onClick={() => setLeadMode("normal")}>Volver al original</button>
            )}
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

            <div className="booki-tip">
              <span className="bav">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                  <circle cx="9" cy="11" r="1.6" />
                  <circle cx="15" cy="11" r="1.6" />
                  <path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6l-3 3v-3H5a1 1 0 0 1-1-1Z" fill="none" stroke="#fff" strokeWidth="1.6" />
                </svg>
              </span>
              <div className="btx">
                <b>Tip de Booki:</b> Para recordar mejor <b>{point.title}</b>, relacionalo con algo que ya sabés. 💡
              </div>
            </div>

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
