"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  initAudio, setMuted,
  sfxCorrect, sfxWrong, sfxTick, sfxStreak, sfxWin, sfxGameOver, sfxSelect,
  startMusic, setMusicWanted,
} from "@/lib/game/sfx";

export type GameQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Props = {
  noteId: string;
  noteTitle: string;
  questions: GameQuestion[];
  bestScore: number;
  isDemo?: boolean;
};

const LIVES = 10;
const QUESTION_TIME = 15; // segundos, fijo y generoso
const BASE_POINTS = 1000;
const MIN_CORRECT = 120; // piso de puntos por acertar aunque sea lento

// Estilo por posición: color neón + forma tipo Kahoot.
const OPTS = [
  { color: "#ff3b5c", glow: "255,59,92", shape: "triangle" },
  { color: "#2b7fff", glow: "43,127,255", shape: "diamond" },
  { color: "#ffb020", glow: "255,176,32", shape: "circle" },
  { color: "#22c55e", glow: "34,197,94", shape: "square" },
] as const;

function Shape({ kind, size = 20 }: { kind: string; size?: number }) {
  const c = "#fff";
  if (kind === "triangle") return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 3 22 21H2Z" fill={c} /></svg>;
  if (kind === "diamond") return <svg width={size} height={size} viewBox="0 0 24 24"><path d="M12 2 22 12 12 22 2 12Z" fill={c} /></svg>;
  if (kind === "circle") return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill={c} /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" fill={c} /></svg>;
}

function Heart({ full }: { full: boolean }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        d="M12 21s-7.5-4.7-10-9.3C.5 8.5 2 5 5.3 5c2 0 3.3 1.2 4.2 2.4C10.4 6.2 11.7 5 13.7 5 17 5 18.5 8.5 17 11.7 14.5 16.3 12 21 12 21Z"
        transform="translate(1 -1)"
        fill={full ? "#ff3b5c" : "rgba(255,255,255,.12)"}
        stroke={full ? "rgba(255,120,150,.9)" : "rgba(255,255,255,.18)"}
        strokeWidth="1"
      />
    </svg>
  );
}

// ---- fondo synthwave neón (ESTÁTICO: los blobs con blur no se animan por
// frame — animar un blur grande es carísimo para la GPU y trababa el juego). ----
function GameBackground({ intensity }: { intensity: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, #241b52 0%, #150f31 45%, #0c0920 100%)" }}>
      {[
        { c: "#7c3aed", x: "12%", y: "16%", s: 400 },
        { c: "#2b7fff", x: "84%", y: "20%", s: 360 },
        { c: "#ff3b5c", x: "72%", y: "84%", s: 320 },
        { c: "#22c55e", x: "18%", y: "82%", s: 280 },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: b.x, top: b.y, width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2,
          borderRadius: "50%", background: b.c, filter: "blur(64px)",
          opacity: 0.26 + intensity * 0.14, transition: "opacity .5s ease",
        }} />
      ))}
      {/* grid synthwave inferior (estático) */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, height: "42%",
        backgroundImage: "linear-gradient(rgba(150,110,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(150,110,255,.16) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        transform: "perspective(340px) rotateX(62deg)", transformOrigin: "bottom",
        maskImage: "linear-gradient(to top, #000 10%, transparent 80%)",
        WebkitMaskImage: "linear-gradient(to top, #000 10%, transparent 80%)",
        opacity: 0.5 + intensity * 0.2, transition: "opacity .5s ease",
      }} />
    </div>
  );
}

// ---- Booki que reacciona ----
function Booki({ mood }: { mood: "idle" | "good" | "bad" }) {
  const reduce = useReducedMotion();
  const anim = reduce ? {} : mood === "good"
    ? { y: [0, -18, 0], rotate: [0, -6, 6, 0], scale: [1, 1.12, 1] }
    : mood === "bad"
      ? { rotate: [0, -9, 9, -6, 0], x: [0, -5, 5, 0] }
      : { y: [0, -8, 0] };
  return (
    <motion.div
      animate={anim}
      transition={{ duration: mood === "idle" ? 3 : 0.6, repeat: mood === "idle" ? Infinity : 0, ease: "easeInOut" }}
      style={{ width: 92, height: 92, filter: mood === "bad" ? "drop-shadow(0 6px 16px rgba(255,59,92,.5))" : "drop-shadow(0 6px 16px rgba(124,58,237,.5))" }}
    >
      <Image src="/booki-3.png" alt="Booki" width={92} height={92} style={{ width: "100%", height: "100%", objectFit: "contain" }} priority />
    </motion.div>
  );
}

export function GameClient({ noteId, noteTitle, questions, bestScore, isDemo = false }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"intro" | "playing" | "over">("intro");
  const [qIndex, setQIndex] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [gained, setGained] = useState(0); // puntos ganados en la respuesta actual
  const [mood, setMood] = useState<"idle" | "good" | "bad">("idle");
  const [muted, setMutedState] = useState(false);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [record, setRecord] = useState<{ best: number; isRecord: boolean } | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const deadline = useRef<number>(0);
  const barKey = useRef(0);
  const confettiRef = useRef<HTMLDivElement>(null);

  const burst = useCallback((strong: boolean) => {
    const layer = confettiRef.current;
    if (!layer || reduce) return;
    layer.replaceChildren(); // no acumular explosiones (evita el lag)
    const colors = ["#ff3b5c", "#2b7fff", "#ffb020", "#22c55e", "#c4b5fd", "#f9a8d4"];
    const n = strong ? 26 : 16;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.style.cssText = `position:absolute;left:50%;top:34%;width:9px;height:14px;border-radius:2px;background:${colors[i % colors.length]};--cx:${Math.random() * 280 - 140}px;--cy:${230 + Math.random() * 280}px;--cr:${Math.random() * 800 - 400}deg;animation:gcConfetti ${0.9 + Math.random() * 0.7}s cubic-bezier(.2,.7,.3,1) forwards`;
      layer.appendChild(p);
    }
    setTimeout(() => layer.replaceChildren(), 1700);
  }, [reduce]);

  const q = questions[qIndex];
  const mult = streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => { clearTimers(); setMusicWanted(false); }, [clearTimers]);

  const finish = useCallback(async (finalScore: number, finalCorrect: number, finalAnswered: number) => {
    clearTimers();
    setMusicWanted(false);
    setPhase("over");
    const acc = finalAnswered ? Math.round((finalCorrect / finalAnswered) * 100) : 0;
    if (finalScore >= bestScore && finalScore > 0) sfxWin(); else sfxGameOver();
    if (isDemo) { setRecord({ best: Math.max(bestScore, finalScore), isRecord: finalScore > bestScore }); return; }
    try {
      const r = await fetch("/api/game/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_id: noteId, score: finalScore, accuracy: acc }),
      });
      const d = await r.json().catch(() => ({}));
      setRecord({ best: d?.best_score ?? Math.max(bestScore, finalScore), isRecord: !!d?.is_record });
    } catch {
      setRecord({ best: Math.max(bestScore, finalScore), isRecord: finalScore > bestScore });
    }
  }, [bestScore, clearTimers, isDemo, noteId]);

  const nextOrEnd = useCallback((nextLives: number, curScore: number, curCorrect: number, curAnswered: number) => {
    if (nextLives <= 0 || qIndex + 1 >= questions.length) {
      finish(curScore, curCorrect, curAnswered);
      return;
    }
    setQIndex((i) => i + 1);
    setChosen(null);
    setLocked(false);
    setGained(0);
    setMood("idle");
  }, [finish, qIndex, questions.length]);

  // Arranca el timer de la pregunta actual cuando estamos jugando y no bloqueados.
  useEffect(() => {
    if (phase !== "playing" || locked) return;
    clearTimers();
    barKey.current += 1;
    deadline.current = Date.now() + QUESTION_TIME * 1000;
    // ticks en los últimos 3s
    for (let s = 3; s >= 1; s--) {
      timers.current.push(setTimeout(() => sfxTick(), (QUESTION_TIME - s) * 1000));
    }
    // timeout → cuenta como error
    timers.current.push(setTimeout(() => handleAnswer(-1), QUESTION_TIME * 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex, locked]);

  function handleAnswer(optIndex: number) {
    if (locked || phase !== "playing") return;
    clearTimers();
    setLocked(true);
    setChosen(optIndex);
    if (optIndex >= 0) sfxSelect();

    const isCorrect = optIndex === q.correctIndex;
    const frac = Math.max(0, Math.min(1, (deadline.current - Date.now()) / (QUESTION_TIME * 1000)));
    const newAnswered = answered + 1;
    setAnswered(newAnswered);

    if (isCorrect) {
      const newStreak = streak + 1;
      const m = newStreak >= 5 ? 2 : newStreak >= 3 ? 1.5 : 1;
      const pts = Math.round(Math.max(MIN_CORRECT, BASE_POINTS * frac) * m);
      const newScore = score + pts;
      const newCorrect = correctCount + 1;
      setGained(pts);
      setScore(newScore);
      setStreak(newStreak);
      setMaxStreak((v) => Math.max(v, newStreak));
      setCorrectCount(newCorrect);
      setMood("good");
      setFlash("good");
      burst(newStreak >= 3);
      if (newStreak >= 3) sfxStreak(); else sfxCorrect();
      timers.current.push(setTimeout(() => setFlash(null), 420));
      timers.current.push(setTimeout(() => nextOrEnd(lives, newScore, newCorrect, newAnswered), 1500));
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      setStreak(0);
      setMood("bad");
      setFlash("bad");
      sfxWrong();
      timers.current.push(setTimeout(() => setFlash(null), 420));
      timers.current.push(setTimeout(() => nextOrEnd(newLives, score, correctCount, newAnswered), 1650));
    }
  }

  function start() {
    initAudio();
    startMusic();
    setPhase("playing");
  }

  function toggleMute() {
    const m = !muted;
    setMuted(m); setMutedState(m);
  }

  function replay() {
    clearTimers();
    setPhase("intro");
    setQIndex(0); setLives(LIVES); setScore(0); setStreak(0); setMaxStreak(0);
    setCorrectCount(0); setAnswered(0); setChosen(null); setLocked(false); setGained(0); setMood("idle"); setRecord(null);
  }

  return (
    <div className="gc-root" style={{ position: "fixed", inset: 0, zIndex: 500, color: "#fff", fontFamily: "var(--po, system-ui)", overflow: "hidden", userSelect: "none", WebkitTapHighlightColor: "transparent" }}>
      <style>{`
        .gc-root, .gc-root * { box-sizing: border-box; }
        @keyframes gcShake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-10px)} 30%{transform:translateX(10px)} 45%{transform:translateX(-8px)} 60%{transform:translateX(8px)} 80%{transform:translateX(-4px)} }
        @keyframes gcConfetti { to { transform: translate(var(--cx), var(--cy)) rotate(var(--cr)); opacity: 0; } }
        @keyframes gcGlow { 0%,100%{ box-shadow: 0 12px 40px rgba(99,60,220,.55) } 50%{ box-shadow: 0 16px 60px rgba(150,110,255,.95), 0 0 0 7px rgba(139,92,246,.16) } }
        .gc-opt:hover { filter: brightness(1.12); }
        .gc-btn { cursor: pointer; }
      `}</style>

      <GameBackground intensity={Math.min(1, streak / 5)} />

      {/* flash de pantalla en cada respuesta */}
      <AnimatePresence>
        {flash && (
          <motion.div key={flash + qIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
            style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3, background: flash === "good"
              ? "radial-gradient(circle at 50% 58%, rgba(34,197,94,.42), transparent 68%)"
              : "radial-gradient(circle at 50% 58%, rgba(255,59,92,.5), transparent 68%)" }} />
        )}
      </AnimatePresence>

      {/* confetti */}
      <div ref={confettiRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 6, overflow: "hidden" }} />

      {/* puntos grandes / feedback central */}
      <AnimatePresence>
        {locked && phase === "playing" && (
          gained > 0 ? (
            <motion.div key={"pts" + qIndex} initial={{ y: 30, opacity: 0, scale: 0.4 }} animate={{ y: -46, opacity: [0, 1, 1, 0], scale: 1.1 }} transition={{ duration: 1.15, times: [0, 0.15, 0.7, 1] }}
              style={{ position: "absolute", left: "50%", top: "40%", transform: "translateX(-50%)", zIndex: 7, textAlign: "center", pointerEvents: "none" }}>
              <div style={{ fontWeight: 900, fontSize: "clamp(38px,11vw,64px)", color: "#22c55e", textShadow: "0 0 34px rgba(34,197,94,.95)", lineHeight: 1 }}>+{gained.toLocaleString("es-AR")}</div>
              {mult > 1 && <div style={{ fontWeight: 900, fontSize: 20, color: "#ffb020", textShadow: "0 0 20px rgba(255,176,32,.9)", marginTop: 4 }}>RACHA ×{mult} 🔥</div>}
            </motion.div>
          ) : (
            <motion.div key={"miss" + qIndex} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}
              style={{ position: "absolute", left: "50%", top: "40%", transform: "translateX(-50%)", zIndex: 7, fontWeight: 900, fontSize: "clamp(26px,7vw,40px)", color: "#ff5b78", textShadow: "0 0 26px rgba(255,59,92,.9)", whiteSpace: "nowrap", pointerEvents: "none" }}>
              {chosen === -1 ? "¡Tiempo!" : "¡Ups!"} −1 ❤
            </motion.div>
          )
        )}
      </AnimatePresence>

      {/* top bar: volver + mute */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 8, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "max(12px, env(safe-area-inset-top)) 14px 12px" }}>
        <Link href={`/app/ia?note_id=${noteId}`} onClick={() => { clearTimers(); setMusicWanted(false); }} className="gc-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.85)", textDecoration: "none", fontSize: 13.5, fontWeight: 600, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 999, padding: "7px 14px", backdropFilter: "blur(6px)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
          Salir
        </Link>
        <button onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"} className="gc-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, color: "#fff", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, backdropFilter: "blur(6px)" }}>
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m23 9-6 6M17 9l6 6" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>
          )}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {phase === "intro" && (
          <IntroScreen key="intro" noteTitle={noteTitle} bestScore={bestScore} onStart={start} reduce={!!reduce} />
        )}

        {phase === "playing" && q && (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: "60px 14px max(18px, env(safe-area-inset-bottom))", width: "100%", maxWidth: 760, margin: "0 auto", overflow: "hidden" }}>

            {/* HUD */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 3 }}>
                {Array.from({ length: LIVES }).map((_, i) => <Heart key={i} full={i < lives} />)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {streak >= 2 && (
                  <motion.div key={streak} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 14, color: "#ffb020", textShadow: "0 0 12px rgba(255,176,32,.7)" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffb020"><path d="M12 2c1 4-2 5-2 8a2 2 0 0 0 4 0c2 2 3 4 3 6a5 5 0 0 1-10 0c0-4 3-6 5-14Z" /></svg>
                    {streak}{mult > 1 ? ` ×${mult}` : ""}
                  </motion.div>
                )}
                <motion.div key={score} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 14 }}
                  style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-.02em", textShadow: "0 0 16px rgba(124,58,237,.7)" }}>
                  {score.toLocaleString("es-AR")}
                </motion.div>
              </div>
            </div>

            {/* timer */}
            <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,.1)", overflow: "hidden", marginBottom: 18 }}>
              {!locked && (
                <motion.div key={barKey.current} initial={{ width: "100%" }} animate={{ width: "0%" }}
                  transition={{ duration: QUESTION_TIME, ease: "linear" }}
                  style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg,#22c55e,#ffb020,#ff3b5c)" }} />
              )}
            </div>

            {/* pregunta */}
            <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, minHeight: 120, marginBottom: 16 }}>
              <Booki mood={mood} />
              <motion.div key={qIndex} initial={{ y: 24, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}
                style={{ flex: 1, maxWidth: 620, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 20, padding: "18px 20px", backdropFilter: "blur(10px)", boxShadow: "0 10px 40px rgba(0,0,0,.35)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.55)", marginBottom: 6, letterSpacing: ".04em" }}>
                  PREGUNTA {qIndex + 1} / {questions.length}
                </div>
                <div style={{ fontSize: "clamp(16px, 2.4vw, 21px)", fontWeight: 700, lineHeight: 1.35 }}>{q.question}</div>
              </motion.div>
            </div>

            {/* opciones */}
            <div style={{ display: "grid", gridTemplateColumns: q.options.length <= 2 ? "1fr" : "1fr 1fr", gap: 12, marginTop: "auto" }}>
              {q.options.map((opt, i) => {
                const st = OPTS[i % 4];
                const isChosen = chosen === i;
                const isCorrect = i === q.correctIndex;
                const reveal = locked;
                const bg = st.color;
                let opacity = 1;
                let extraGlow = "";
                if (reveal) {
                  if (isCorrect) { extraGlow = `, 0 0 55px rgba(${st.glow},1), 0 0 0 4px rgba(255,255,255,.55)`; }
                  else if (isChosen) { opacity = 0.92; }
                  else { opacity = 0.28; }
                }
                return (
                  <motion.button
                    key={i}
                    className="gc-opt gc-btn"
                    disabled={locked}
                    onClick={() => handleAnswer(i)}
                    initial={{ y: 22, opacity: 0 }}
                    animate={{ y: 0, opacity, scale: reveal && isCorrect ? 1.035 : reveal && isChosen && !isCorrect ? 0.96 : 1 }}
                    transition={{ delay: reduce ? 0 : i * 0.05, type: "spring", stiffness: 260, damping: reveal && isCorrect ? 11 : 20 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, textAlign: "left",
                      padding: "16px 18px", minHeight: 62, borderRadius: 16, border: "none",
                      background: bg, color: "#fff", fontWeight: 700, fontSize: "clamp(14px,2vw,16px)",
                      boxShadow: `0 8px 24px rgba(${st.glow},.35)${extraGlow}`,
                      animation: reveal && isChosen && !isCorrect ? "gcShake .4s" : undefined,
                      position: "relative",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, background: "rgba(0,0,0,.16)", borderRadius: 9, flexShrink: 0 }}>
                      <Shape kind={st.shape} />
                    </span>
                    <span style={{ flex: 1 }}>{opt}</span>
                    {reveal && isCorrect && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                    {reveal && isChosen && !isCorrect && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    )}
                  </motion.button>
                );
              })}
            </div>

          </motion.div>
        )}

        {phase === "over" && (
          <EndScreen key="over" noteId={noteId} score={score} correct={correctCount} answered={answered}
            maxStreak={maxStreak} lives={lives} record={record} onReplay={replay} reduce={!!reduce} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Intro ----
function IntroScreen({ noteTitle, bestScore, onStart, reduce }: { noteTitle: string; bestScore: number; onStart: () => void; reduce: boolean }) {
  return (
    <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 16 }}>
        <div style={{ width: 130, height: 130, margin: "0 auto 8px" }}>
          <Image src="/booki-3.png" alt="Booki" width={130} height={130} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 8px 24px rgba(124,58,237,.6))" }} priority />
        </div>
      </motion.div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ fontSize: "clamp(30px,7vw,52px)", fontWeight: 900, letterSpacing: "-.03em", margin: "4px 0 6px", background: "linear-gradient(90deg,#c4b5fd,#818cf8,#f9a8d4)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 24px rgba(129,140,248,.5))" }}>
        Modo Juego
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ color: "rgba(255,255,255,.7)", fontSize: 15, maxWidth: 420, lineHeight: 1.5, margin: "0 0 22px" }}>
        Respondé rápido y sin errores. <b style={{ color: "#fff" }}>10 vidas</b>, puntos por velocidad y multiplicador de racha. Tema: <b style={{ color: "#c4b5fd" }}>{noteTitle}</b>.
      </motion.p>

      {bestScore > 0 && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.28 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,176,32,.12)", border: "1px solid rgba(255,176,32,.35)", color: "#ffce6b", borderRadius: 999, padding: "9px 18px", fontWeight: 700, fontSize: 14, marginBottom: 22 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="#ffb020"><path d="M6 4h12v3a4 4 0 0 1-3 3.87V13l2 5H7l2-5v-2.13A4 4 0 0 1 6 7Z" /></svg>
          Tu récord: {bestScore.toLocaleString("es-AR")} · ¿Lo superás?
        </motion.div>
      )}

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.34 }}>
        <motion.div animate={reduce ? {} : { scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} style={{ display: "inline-block" }}>
          <motion.button
            onClick={onStart}
            className="gc-btn"
            whileHover={reduce ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.94 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 52px", borderRadius: 999, border: "none", color: "#fff", fontWeight: 800, fontSize: 20, cursor: "pointer", background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", animation: reduce ? undefined : "gcGlow 1.5s ease-in-out infinite" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
            Jugar
          </motion.button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ---- Fin ----
function EndScreen({ noteId, score, correct, answered, maxStreak, lives, record, onReplay, reduce }: {
  noteId: string; score: number; correct: number; answered: number; maxStreak: number; lives: number;
  record: { best: number; isRecord: boolean } | null; onReplay: () => void; reduce: boolean;
}) {
  const acc = answered ? Math.round((correct / answered) * 100) : 0;
  const stats = [
    { label: "Correctas", value: `${correct}/${answered}` },
    { label: "Precisión", value: `${acc}%` },
    { label: "Mejor racha", value: `${maxStreak}` },
    { label: "Vidas restantes", value: `${lives}` },
  ];
  return (
    <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "70px 22px 24px", textAlign: "center", overflowY: "auto" }}>
      {record?.isRecord && (
        <motion.div initial={{ scale: 0.4, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#ffb020,#ff8a3d)", color: "#3a2400", borderRadius: 999, padding: "8px 18px", fontWeight: 900, fontSize: 15, marginBottom: 14, boxShadow: "0 8px 30px rgba(255,176,32,.5)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3a2400"><path d="M6 4h12v3a4 4 0 0 1-3 3.87V13l2 5H7l2-5v-2.13A4 4 0 0 1 6 7Z" /></svg>
          ¡NUEVO RÉCORD!
        </motion.div>
      )}
      <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.05 }}
        style={{ fontSize: "clamp(15px,3.5vw,18px)", color: "rgba(255,255,255,.65)", fontWeight: 700 }}>
        {lives > 0 ? "¡Terminaste!" : "Game Over"}
      </motion.div>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 220, damping: 13, delay: 0.12 }}
        style={{ fontSize: "clamp(48px,14vw,84px)", fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1, margin: "4px 0 4px", textShadow: "0 0 40px rgba(124,58,237,.8)" }}>
        {score.toLocaleString("es-AR")}
      </motion.div>
      <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginBottom: 22 }}>puntos</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", maxWidth: 380, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: reduce ? 0 : 0.2 + i * 0.08 }}
            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 16, padding: "14px 12px" }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.55)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {record && !record.isRecord && record.best > 0 && (
        <div style={{ color: "rgba(255,255,255,.55)", fontSize: 13.5, marginBottom: 18 }}>
          Tu récord sigue siendo <b style={{ color: "#ffce6b" }}>{record.best.toLocaleString("es-AR")}</b>. ¡Casi!
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <motion.button onClick={onReplay} className="gc-btn" whileHover={reduce ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.95 }}
          style={{ padding: "15px 34px", borderRadius: 999, border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer", background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", boxShadow: "0 10px 34px rgba(99,60,220,.55)" }}>
          Jugar de nuevo
        </motion.button>
        <Link href={`/app/ia?note_id=${noteId}`} className="gc-btn" style={{ display: "inline-flex", alignItems: "center", padding: "15px 28px", borderRadius: 999, color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 16, background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.16)" }}>
          Volver
        </Link>
      </div>
    </motion.div>
  );
}
