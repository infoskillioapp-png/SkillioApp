"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

const KX_COLORS = [
  "linear-gradient(135deg,#5b8cff,#3f63ff)",
  "linear-gradient(135deg,#9a63f7,#7c3aed)",
  "linear-gradient(135deg,#ff5d79,#e4264f)",
  "linear-gradient(135deg,#ffc93c,#ffb020)",
  "linear-gradient(135deg,#34d399,#10b981)",
  "linear-gradient(135deg,#f472b6,#db2777)",
];

const PAL = ["#4f7dff","#8b5cf6","#ff6b81","#ffc93c","#34d399","#f472b6","#2dd4bf"];

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

// ---- tipos ----
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
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setFinished(true);
    }
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
  onSelect,
}: {
  sections: SummarySection[];
  activeIdx: number;
  doneSet: Set<number>;
  onSelect: (i: number) => void;
}) {
  return (
    <aside className="rside in">
      <h2 className="po">
        Temas
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--faint)" }}>
          <path d="M9 3v18M3 9h18" opacity=".5" /><rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
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
            const globalIdx = sections.slice(0, si).reduce((a, s) => a + s.points.length, 0) + pi;
            const isDone = doneSet.has(globalIdx);
            const isActive = globalIdx === activeIdx;
            return (
              <div
                key={pi}
                className={`t-item${isDone ? " done" : ""}${isActive ? " on" : ""}`}
                onClick={() => onSelect(globalIdx)}
              >
                <span className="t-dot">{isDone ? "✓" : ""}</span>
                <div>
                  <div className="t-name">{pt.emoji ? `${pt.emoji} ${pt.title}` : pt.title}</div>
                  <div className="t-sub">{isDone ? "Dominado · 100%" : isActive ? "En progreso" : "Sin empezar"}</div>
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
export function ResumenClient({ data }: { data: ResumenData }) {
  // Aplanar todos los puntos de todas las secciones
  const allPoints: { point: SummaryPoint; secName: string; localIdx: number }[] = [];
  data.sections.forEach((sec) => {
    sec.points.forEach((pt, i) => {
      allPoints.push({ point: pt, secName: sec.name, localIdx: i });
    });
  });

  const [activeIdx, setActiveIdx] = useState(0);
  const [doneSet, setDoneSet] = useState<Set<number>>(new Set());
  const [leadMode, setLeadMode] = useState<"normal" | "eli5" | "more">("normal");

  const active = allPoints[activeIdx] ?? allPoints[0];
  const totalTopics = allPoints.length;
  const doneCount = doneSet.size;

  const handleQuizDone = useCallback((_rect: DOMRect) => {
    setDoneSet((prev) => new Set([...prev, activeIdx]));
  }, [activeIdx]);

  function markDone() {
    setDoneSet((prev) => new Set([...prev, activeIdx]));
    if (activeIdx < totalTopics - 1) setActiveIdx((i) => i + 1);
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
          {doneCount}/{totalTopics} dominados
        </div>
      </div>

      <div className="rwrap">
        {/* sidebar */}
        <ResumenSidebar
          sections={data.sections}
          activeIdx={activeIdx}
          doneSet={doneSet}
          onSelect={setActiveIdx}
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
                {doneSet.has(activeIdx) ? "Dominado · 100%" : "En progreso"}
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
              {/* Mostrar los demás puntos de la misma categoría como puntos clave */}
              {data.sections
                .flatMap((s) => s.points)
                .slice(Math.max(0, activeIdx - 1), activeIdx + 3)
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
                <b>Tip de Booki:</b> Para recordar mejor <b>{point.title}</b>, relacionalo con algo que ya sabés. La memoria funciona por asociaciones, no de memoria pura. 💡
              </div>
            </div>
          </div>

          {/* práctica rápida */}
          {data.quizQuestions.length > 0 && (
            <PracticaQuiz
              questions={data.quizQuestions.slice(
                activeIdx * 2,
                activeIdx * 2 + 2
              )}
              topicName={point.title}
              onDone={handleQuizDone}
            />
          )}

          {/* nav entre temas */}
          <div style={{ display: "flex", gap: 12, marginTop: 8, paddingBottom: 40 }}>
            {activeIdx > 0 && (
              <button className="nbtn ghost" onClick={() => setActiveIdx((i) => i - 1)}>
                ← Anterior
              </button>
            )}
            {!doneSet.has(activeIdx) && (
              <button className="nbtn" onClick={markDone}>
                Marcar como dominado ✓
              </button>
            )}
            {activeIdx < totalTopics - 1 && (
              <button className="nbtn" onClick={() => setActiveIdx((i) => i + 1)} style={{ marginLeft: "auto" }}>
                Siguiente tema →
              </button>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
