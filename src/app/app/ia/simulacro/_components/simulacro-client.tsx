"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SalePopup } from "@/components/sale-popup";

const PAL = ["#4f7dff","#8b5cf6","#ff6b81","#ffc93c","#34d399","#f472b6","#2dd4bf"];
const FREE_LIMIT = 3;

function confettiBurst(x: number, y: number) {
  const lay = document.getElementById("confetti-layer");
  if (!lay) return;
  for (let i = 0; i < 36; i++) {
    const p = document.createElement("span");
    p.style.cssText = `position:absolute;width:9px;height:14px;border-radius:2px;left:${x}px;top:${y}px;background:${PAL[i % PAL.length]};--dx:${Math.random() * 260 - 130}px;transform:rotate(${Math.random() * 360}deg);animation:cftFall ${0.8 + Math.random() * 0.7}s ease-out forwards`;
    lay.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}

type MCQ = { kind: "multiple_choice"; question: string; options: string[]; correct: number; explanation: string };
type TFQ = { kind: "true_false"; question: string; correct: boolean; explanation: string };
type SAQ = { kind: "short_answer"; question: string; correct: string; explanation: string };
export type SimQuestion = MCQ | TFQ | SAQ;

export type SimulacroData = {
  noteId: string;
  noteTitle: string;
  subjectName: string;
  questions: SimQuestion[];
};

function normalizeQuestion(q: SimQuestion): { question: string; options: string[]; correct: number; explanation: string } {
  if (q.kind === "multiple_choice") {
    return { question: q.question, options: q.options, correct: q.correct, explanation: q.explanation };
  } else if (q.kind === "true_false") {
    return { question: q.question, options: ["Verdadero", "Falso"], correct: q.correct ? 0 : 1, explanation: q.explanation };
  } else {
    return { question: q.question, options: [q.correct, "No corresponde"], correct: 0, explanation: q.explanation };
  }
}

function ScoreRing({ ok, total }: { ok: number; total: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const scoreRef = useRef<SVGTextElement>(null);
  const RC = 2 * Math.PI * 50;

  useEffect(() => {
    const ring = ringRef.current;
    const text = scoreRef.current;
    if (!ring || !text) return;
    ring.style.strokeDasharray = String(RC);
    ring.style.strokeDashoffset = String(RC);
    const t = setTimeout(() => {
      ring.style.transition = "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)";
      ring.style.strokeDashoffset = String(RC - (ok / total) * RC);
      const start = performance.now();
      (function tick(now) {
        const p = Math.min((now - start) / 800, 1);
        const e = 1 - Math.pow(1 - p, 3);
        text.textContent = String(Math.round(ok * e));
        if (p < 1) requestAnimationFrame(tick);
      })(performance.now());
    }, 250);
    return () => clearTimeout(t);
  }, [ok, total, RC]);

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="50" fill="none" stroke="#eceefb" strokeWidth="12" />
      <circle ref={ringRef} cx="60" cy="60" r="50" fill="none" stroke="url(#ssg)" strokeWidth="12" strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }} />
      <defs>
        <linearGradient id="ssg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4f7dff" />
        </linearGradient>
      </defs>
      <text ref={scoreRef} x="60" y="58" textAnchor="middle" fontFamily="Poppins" fontWeight="800" fontSize="24" fill="#1f2347">0</text>
      <text x="60" y="76" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="#8487a6">de {total}</text>
    </svg>
  );
}

export function SimulacroClient({ data, isPro }: { data: SimulacroData; isPro: boolean }) {
  const allNormalized = data.questions.map(normalizeQuestion);
  const visibleNormalized = isPro ? allNormalized : allNormalized.slice(0, FREE_LIMIT);
  const blurQuestion = !isPro && allNormalized.length > FREE_LIMIT ? allNormalized[FREE_LIMIT] : null;
  const lockedCount = isPro ? 0 : Math.max(0, allNormalized.length - FREE_LIMIT);

  const [phase, setPhase] = useState<"intro" | "exam" | "result">("intro");
  const [order, setOrder] = useState<number[]>(visibleNormalized.map((_, i) => i));
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [secs, setSecs] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [lastWrong, setLastWrong] = useState<number[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const reviewRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!timerActive) return;
    const iv = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [timerActive]);

  const M = order.length;
  const normalized = visibleNormalized;
  const progress = M > 0 ? (cur / M) * 100 : 0;
  const currentQ = cur < M ? normalized[order[cur]] : null;

  function startExam(qs: number[]) {
    setOrder(qs);
    setAnswers(new Array(qs.length).fill(null));
    setCur(0);
    setSecs(0);
    setTimerActive(true);
    setPhase("exam");
  }

  function chooseOpt(idx: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[cur] = idx;
      return next;
    });
  }

  function goNext() {
    if (cur < M - 1) {
      setCur((c) => c + 1);
    } else {
      finishExam();
    }
  }

  function goPrev() {
    if (cur > 0) setCur((c) => c - 1);
  }

  function finishExam() {
    setTimerActive(false);
    setPhase("result");
    const wrong = order.filter((qi, pos) => answers[pos] !== normalized[qi].correct);
    setLastWrong(wrong);
    const ok = order.filter((qi, pos) => answers[pos] === normalized[qi].correct).length;
    const pct = Math.round((ok / M) * 100);
    if (pct > 50) {
      setTimeout(() => {
        confettiBurst(window.innerWidth / 2, 150);
        setTimeout(() => confettiBurst(window.innerWidth * 0.35, 180), 250);
      }, 500);
    }
    setTimeout(() => {
      reviewRefs.current.forEach((ref, i) => {
        setTimeout(() => { if (ref) ref.classList.add("in"); }, 150 + i * 90);
      });
    }, 300);
  }

  const ok = order.filter((qi, pos) => answers[pos] === normalized[qi].correct).length;
  const pct = M > 0 ? Math.round((ok / M) * 100) : 0;
  const timeFmt = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <>
      <div id="confetti-layer" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 80, overflow: "hidden" }} />

      {showPaywall && <SalePopup ctx="simulacro" onClose={() => setShowPaywall(false)} />}

      {/* topbar */}
      <div className="rtopbar">
        <Link href={`/app/ia?note_id=${data.noteId}`} className="back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Volver
        </Link>
        <div className="crumb-r">{data.subjectName} · <b>Simulacro</b></div>
        {phase === "exam" && (
          <div className="timer-pill show">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
            {timeFmt}
          </div>
        )}
      </div>

      <div className="sim-stage">
        {/* ---- intro ---- */}
        {phase === "intro" && (
          <div className="sim-intro">
            <div className="ic">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <h1>Simulacro · {data.noteTitle}</h1>
            <p>Poné a prueba lo que estudiaste con un examen tipo múltiple choice.</p>
            <div className="specs">
              <div className="spec">
                <b>{!isPro && lockedCount > 0 ? FREE_LIMIT : data.questions.length}</b>
                <span>preguntas{!isPro && lockedCount > 0 ? ` / ${data.questions.length} 🔒` : ""}</span>
              </div>
              <div className="spec"><b>~{Math.ceil((isPro ? data.questions.length : FREE_LIMIT) * 0.8)} min</b><span>duración</span></div>
              <div className="spec"><b>{data.subjectName.slice(0, 8)}</b><span>materia</span></div>
            </div>

            {/* aviso de lock para free */}
            {!isPro && lockedCount > 0 && (
              <div style={{
                background: "rgba(139,92,246,.07)",
                border: "1.5px solid rgba(139,92,246,.2)",
                borderRadius: 16, padding: "12px 16px",
                marginBottom: 14, maxWidth: 360,
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: 22 }}>🔒</span>
                <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
                  Plan gratuito · Solo {FREE_LIMIT} de {data.questions.length} preguntas disponibles.{" "}
                  <button onClick={() => setShowPaywall(true)} style={{ color: "#8b5cf6", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13 }}>
                    Desbloqueá el simulacro completo →
                  </button>
                </div>
              </div>
            )}

            <button
              className="simnav snbtn coral"
              style={{ display: "inline-flex", padding: "13px 26px", fontSize: 15, borderRadius: 15 }}
              onClick={() => startExam(visibleNormalized.map((_, i) => i))}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              Comenzar simulacro
            </button>
          </div>
        )}

        {/* ---- examen ---- */}
        {phase === "exam" && currentQ && (
          <div className="sim-exam show">
            <div className="simprog">
              <div className="bar"><i style={{ width: progress + "%" }} /></div>
              <div className="lab">Pregunta {cur + 1} de {M}</div>
            </div>
            <div className="qcard">
              <div className="qeye">Pregunta {cur + 1}</div>
              <h2>{currentQ.question}</h2>
              <div className="qopts">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`qopt${answers[cur] === i ? " sel" : ""}`}
                    onClick={() => chooseOpt(i)}
                  >
                    <span className="mk">{String.fromCharCode(65 + i)}</span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="simnav">
              <button className="snbtn ghost" onClick={goPrev} style={{ visibility: cur === 0 ? "hidden" : "visible" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                Anterior
              </button>
              <button
                className={`snbtn${cur === M - 1 ? " coral" : ""}`}
                onClick={goNext}
                disabled={answers[cur] === null}
              >
                {cur < M - 1 ? (
                  <>Siguiente <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg></>
                ) : (
                  <>Finalizar <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ---- resultado ---- */}
        {phase === "result" && (
          <div className="sim-result show">
            <div className="rscene" style={{ backgroundImage: `url(${pct > 50 ? "/fondo_exito.png" : "/fondo_fracaso.png"})` }}>
              <div className="cap">
                <h2>{pct > 50 ? "¡Aprobado!" : "Casi… ¡seguí practicando!"}</h2>
                <p>{pct > 50 ? "Revisá abajo qué acertaste y dónde reforzar." : "Reforzá lo que erraste y rehacé las incorrectas."}</p>
              </div>
            </div>
            <div className="scorehead">
              <div className="result-ring">
                <ScoreRing ok={ok} total={M} />
              </div>
              <div>
                <div className="slead">Tu resultado</div>
                <div className="mini">
                  <div><b style={{ color: "#10b981" }}>{ok}</b>aciertos</div>
                  <div><b style={{ color: "var(--red)" }}>{M - ok}</b>errores</div>
                  <div><b style={{ color: "var(--blue)" }}>{pct}%</b>nota</div>
                </div>
              </div>
            </div>

            {/* upgrade CTA en resultado para free */}
            {!isPro && lockedCount > 0 && (
              <div style={{
                background: "linear-gradient(135deg,rgba(139,92,246,.08),rgba(79,125,255,.08))",
                border: "1.5px solid rgba(139,92,246,.22)",
                borderRadius: 18, padding: "16px 18px", marginBottom: 18,
              }}>
                <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, marginBottom: 5 }}>
                  🔒 Hay {lockedCount} pregunta{lockedCount !== 1 ? "s" : ""} más en el simulacro completo
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
                  Desbloqueá el examen completo para una preparación real del parcial.
                </div>
                <button
                  onClick={() => setShowPaywall(true)}
                  style={{
                    width: "100%", padding: "11px",
                    background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                    color: "#fff", border: "none", borderRadius: 13,
                    fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  ⚡ Desbloquear simulacro completo
                </button>
              </div>
            )}

            <div className="review">
              <h3>Repaso del simulacro</h3>
              {order.map((qi, pos) => {
                const q = normalized[qi];
                const my = answers[pos];
                const isOk = my === q.correct;
                return (
                  <div
                    key={pos}
                    className={`rv ${isOk ? "ok" : "bad"}`}
                    ref={(el) => { reviewRefs.current[pos] = el; }}
                  >
                    <div className="rvq">
                      <span className="tag">{isOk ? "✓" : "✕"}</span>
                      <div>{pos + 1}. {q.question}</div>
                    </div>
                    <div className="rans">
                      <span className={`yo${isOk ? " good" : ""}`}>Tu respuesta:</span>{" "}
                      {my !== null ? q.options[my] : "—"}
                      {!isOk && (
                        <><br /><span className="co">Correcta:</span> {q.options[q.correct]}</>
                      )}
                    </div>
                    {q.explanation && (
                      <div className="rexp">{q.explanation}</div>
                    )}
                  </div>
                );
              })}

              {/* Pregunta blureada — preview de lo que está bloqueado */}
              {blurQuestion && (
                <div style={{ position: "relative", marginTop: 8 }}>
                  <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none" }}
                    className="rv bad">
                    <div className="rvq">
                      <span className="tag">?</span>
                      <div>{order.length + 1}. {blurQuestion.question}</div>
                    </div>
                    <div className="rans">
                      <span className="yo">Hay más preguntas esperándote</span>
                    </div>
                  </div>
                  <div style={{
                    position: "absolute", inset: 0, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    borderRadius: 14, background: "rgba(255,255,255,.5)", backdropFilter: "blur(2px)",
                  }}>
                    <button
                      onClick={() => setShowPaywall(true)}
                      style={{
                        padding: "10px 20px", borderRadius: 12,
                        background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                        color: "#fff", border: "none",
                        fontFamily: "var(--po)", fontWeight: 700, fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      🔒 Desbloquear simulacro completo
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rowbtns" style={{ marginTop: 18 }}>
              {lastWrong.length > 0 && (
                <button className="nbtn" onClick={() => startExam(lastWrong)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" />
                  </svg>
                  Rehacer las incorrectas ({lastWrong.length})
                </button>
              )}
              <button className="nbtn ghost" onClick={() => { setPhase("intro"); setSecs(0); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" />
                </svg>
                Reintentar todo
              </button>
              <Link href={`/app/ia?note_id=${data.noteId}`} className="nbtn">
                Volver al espacio →
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
