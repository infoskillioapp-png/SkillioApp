"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
const QUESTION_TIME = 25; // segundos, fijo y generoso (leer + pensar)
// Economía de monedas (la real del juego): acierto = base + bonus por velocidad,
// luego × multiplicador de racha. Máx 40 por acierto. Partida perfecta ≈ 500.
const COIN_BASE = 10;
const COIN_SPEED_BONUS = 10;
const multOf = (streak: number) => (streak >= 5 ? 2 : streak >= 3 ? 1.5 : 1);

// 4 estilos de opción tipo Kahoot (color + forma), del diseño.
const SHAPES = [
  { bg: "linear-gradient(140deg,#5b8cff,#3b5bdb)", sh: "79,125,255", clip: "polygon(50% 0,100% 100%,0 100%)", r: "0" },
  { bg: "linear-gradient(140deg,#e04fa8,#b02a86)", sh: "193,51,143", clip: "polygon(50% 0,100% 50%,50% 100%,0 50%)", r: "0" },
  { bg: "linear-gradient(140deg,#fbb040,#ef8a14)", sh: "239,138,20", clip: "none", r: "50%" },
  { bg: "linear-gradient(140deg,#22c5c0,#0d8f96)", sh: "13,143,150", clip: "none", r: "5px" },
] as const;
const CONF_COLORS = ["#8b5cf6", "#4f7dff", "#c1338f", "#fbbf24", "#34d399", "#ffffff"];
const F = "'Baloo 2', var(--po, system-ui), sans-serif"; // display juguetona

// ───────────────────────── Moneda 3D (CSS) ─────────────────────────
function Coin3D({ size = 26, spin = 4.5 }: { size?: number; spin?: number }) {
  const star = size * 0.46;
  return (
    <div style={{ position: "relative", width: size, height: size, transformStyle: "preserve-3d", animation: `gcCoinSpin ${spin}s linear infinite`, flexShrink: 0 }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(145deg,#fff3c4,#f5b731 42%,#c9860c)", boxShadow: `0 ${size * 0.15}px ${size * 0.4}px rgba(240,169,29,.5), inset 0 -${size * 0.11}px 0 rgba(120,66,0,.45), inset 0 ${size * 0.11}px 0 rgba(255,255,255,.55)` }} />
      <div style={{ position: "absolute", inset: size * 0.12, borderRadius: "50%", background: "linear-gradient(145deg,#f9cf5c,#e09b12)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", width: star, height: star, transform: "translate(-50%,-50%)", background: "linear-gradient(160deg,#fff6d0,#e8a81a)", clipPath: "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />
    </div>
  );
}

// ───────────────────────── Booki personaje (CSS) ─────────────────────────
function Booki({ mood, scale = 1 }: { mood: "idle" | "good" | "bad" | "cheer"; scale?: number }) {
  const reduce = useReducedMotion();
  const armL = mood === "good" || mood === "cheer" ? -155 : mood === "bad" ? 14 : -8;
  const armR = mood === "good" || mood === "cheer" ? 155 : mood === "bad" ? -14 : 8;
  const anim = reduce ? "none"
    : mood === "good" ? "gcCheer .5s cubic-bezier(.3,1.4,.4,1) 3"
    : mood === "cheer" ? "gcJumpJoy 1.1s cubic-bezier(.3,1.3,.4,1) infinite"
    : mood === "bad" ? "gcWobble .5s ease-in-out 2"
    : "gcFloaty 3.6s ease-in-out infinite";
  return (
    <div style={{ width: 96 * scale, height: 118 * scale, flexShrink: 0 }}>
      <div style={{ position: "relative", width: 96, height: 118, transform: `scale(${scale})`, transformOrigin: "bottom center", animation: anim }}>
        {/* piernas + pies */}
        <div style={{ position: "absolute", left: 19, bottom: 0, width: 18, height: 20, background: "linear-gradient(160deg,#8b5cf6,#6d28d9)", borderRadius: "9px 9px 11px 11px" }} />
        <div style={{ position: "absolute", right: 19, bottom: 0, width: 18, height: 20, background: "linear-gradient(160deg,#8b5cf6,#6d28d9)", borderRadius: "9px 9px 11px 11px" }} />
        <div style={{ position: "absolute", left: 12, bottom: -4, width: 24, height: 11, background: "#3b1a78", borderRadius: 8 }} />
        <div style={{ position: "absolute", right: 12, bottom: -4, width: 24, height: 11, background: "#3b1a78", borderRadius: 8 }} />
        {/* brazos */}
        <div style={{ position: "absolute", left: -6, top: 22, width: 14, height: 40, background: "linear-gradient(160deg,#a78bfa,#7c3aed)", borderRadius: 9, transformOrigin: "top center", transform: `rotate(${armL}deg)`, transition: "transform .3s cubic-bezier(.22,1.5,.4,1)" }} />
        <div style={{ position: "absolute", right: -6, top: 22, width: 14, height: 40, background: "linear-gradient(160deg,#a78bfa,#7c3aed)", borderRadius: 9, transformOrigin: "top center", transform: `rotate(${armR}deg)`, transition: "transform .3s cubic-bezier(.22,1.5,.4,1)" }} />
        {/* cuerpo (libro) */}
        <div style={{ position: "absolute", left: 5, right: 5, top: 14, height: 76, background: "linear-gradient(150deg,#a78bfa,#7c3aed)", borderRadius: "15px 20px 20px 15px", boxShadow: "0 14px 30px rgba(124,58,237,.55), inset -6px 0 0 rgba(255,255,255,.16)" }} />
        <div style={{ position: "absolute", left: 12, top: 23, height: 58, width: 7, background: "rgba(255,255,255,.28)", borderRadius: 7 }} />
        <div style={{ position: "absolute", right: -1, top: 25, height: 54, width: 10, background: "#fff", borderRadius: 4, boxShadow: "0 4px 10px rgba(0,0,0,.25)" }} />
        {/* caras */}
        {(mood === "good" || mood === "cheer") && (
          <>
            <div style={{ position: "absolute", left: 25, top: 42, width: 16, height: 9, borderTop: "4px solid #2b1055", borderRadius: "16px 16px 0 0" }} />
            <div style={{ position: "absolute", left: 50, top: 42, width: 16, height: 9, borderTop: "4px solid #2b1055", borderRadius: "16px 16px 0 0" }} />
            <div style={{ position: "absolute", left: 34, top: 57, width: 24, height: 15, background: "#2b1055", borderRadius: "0 0 24px 24px" }} />
            <div style={{ position: "absolute", left: 22, top: 56, width: 11, height: 7, borderRadius: "50%", background: "rgba(244,114,182,.55)" }} />
            <div style={{ position: "absolute", left: 62, top: 56, width: 11, height: 7, borderRadius: "50%", background: "rgba(244,114,182,.55)" }} />
          </>
        )}
        {mood === "bad" && (
          <>
            <div style={{ position: "absolute", left: 24, top: 42, width: 13, height: 13, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2b1055" }} /></div>
            <div style={{ position: "absolute", left: 50, top: 42, width: 13, height: 13, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "flex-end", justifyContent: "center" }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2b1055" }} /></div>
            <div style={{ position: "absolute", left: 37, top: 62, width: 18, height: 7, borderRadius: 7, background: "#2b1055" }} />
            <div style={{ position: "absolute", right: 2, top: 34, width: 9, height: 12, background: "#7dd3fc", borderRadius: "50% 50% 50% 50% / 62% 62% 38% 38%" }} />
          </>
        )}
        {mood === "idle" && (
          <>
            <div style={{ position: "absolute", left: 24, top: 41, width: 13, height: 14, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 7, height: 8, borderRadius: "50%", background: "#2b1055" }} /></div>
            <div style={{ position: "absolute", left: 50, top: 41, width: 13, height: 14, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 7, height: 8, borderRadius: "50%", background: "#2b1055" }} /></div>
            <div style={{ position: "absolute", left: 36, top: 62, width: 19, height: 10, background: "#2b1055", borderRadius: "0 0 19px 19px" }} />
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Fondo + aura de fuego ─────────────────────────
function GameBackground({ heat }: { heat: number }) {
  const reduce = useReducedMotion();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "radial-gradient(120% 80% at 50% -10%,#3b1177 0%,#1c0442 55%,#12002e 100%)" }}>
      {[
        { c: "#6d3bf2", x: "-24vmax", y: "-18vmax", s: "66vmax", o: 0.62, a: "gcBlobA 22s" },
        { c: "#c1338f", x: "auto", rx: "-20vmax", y: "14vmax", s: "54vmax", o: 0.5, a: "gcBlobB 27s" },
        { c: "#4f7dff", x: "8vmax", by: "-26vmax", s: "58vmax", o: 0.45, a: "gcBlobC 24s" },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute", width: b.s, height: b.s,
          left: b.x, right: b.rx, top: b.y, bottom: b.by,
          borderRadius: "50%", background: `radial-gradient(circle,${b.c},transparent 66%)`,
          filter: "blur(60px)", opacity: b.o, animation: reduce ? "none" : `${b.a} ease-in-out infinite`, pointerEvents: "none",
        }} />
      ))}
      {/* aura de fuego (crece con la racha) */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(120% 90% at 50% 110%,rgba(249,115,22,.55),transparent 60%)", opacity: heat * 0.55, animation: reduce ? "none" : "gcAuraPulse 1.8s ease-in-out infinite", transition: "opacity .5s ease" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 90px rgba(249,115,22,.9), inset 0 0 200px rgba(220,38,38,.55)", opacity: heat * 0.55, transition: "opacity .5s ease" }} />
    </div>
  );
}

// ───────────────────────── Componente principal ─────────────────────────
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
  const [gained, setGained] = useState(0);
  const [mood, setMood] = useState<"idle" | "good" | "bad">("idle");
  const [muted, setMutedState] = useState(false);
  const [record, setRecord] = useState<{ best: number; isRecord: boolean } | null>(null);
  const [multBump, setMultBump] = useState(0);   // dispara la animación del multiplicador
  const [lostIndex, setLostIndex] = useState<number | null>(null); // corazón recién perdido
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const deadline = useRef<number>(0);
  const barKey = useRef(0);

  const q = questions[qIndex];
  const mult = multOf(streak);
  const heat = Math.min(1, streak / 7);
  const low = timeLeft / QUESTION_TIME < 0.3;

  // confetti / monedas pre-generados (no re-render en cada tick)
  const conf = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    x: Math.random() * 100, s: 6 + Math.random() * 9, col: CONF_COLORS[i % CONF_COLORS.length],
    cx: (Math.random() * 2 - 1) * 160, cy: 380 + Math.random() * 360, d: Math.random() * 0.35,
    dur: 1.5 + Math.random() * 1.1, round: Math.random() > 0.5,
  })), []);

  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);
  useEffect(() => () => { clearTimers(); setMusicWanted(false); }, [clearTimers]);

  const finish = useCallback(async (fScore: number, fCorrect: number, fAnswered: number) => {
    clearTimers(); setMusicWanted(false); setPhase("over");
    const acc = fAnswered ? Math.round((fCorrect / fAnswered) * 100) : 0;
    if (fScore >= bestScore && fScore > 0) sfxWin(); else sfxGameOver();
    if (isDemo) { setRecord({ best: Math.max(bestScore, fScore), isRecord: fScore > bestScore }); return; }
    try {
      const r = await fetch("/api/game/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note_id: noteId, score: fScore, accuracy: acc }),
      });
      const d = await r.json().catch(() => ({}));
      setRecord({ best: d?.best_score ?? Math.max(bestScore, fScore), isRecord: !!d?.is_record });
    } catch { setRecord({ best: Math.max(bestScore, fScore), isRecord: fScore > bestScore }); }
  }, [bestScore, clearTimers, isDemo, noteId]);

  const nextOrEnd = useCallback((nextLives: number, cScore: number, cCorrect: number, cAnswered: number) => {
    if (nextLives <= 0 || qIndex + 1 >= questions.length) { finish(cScore, cCorrect, cAnswered); return; }
    setQIndex((i) => i + 1); setChosen(null); setLocked(false); setGained(0); setMood("idle"); setLostIndex(null);
  }, [finish, qIndex, questions.length]);

  // timer de la pregunta actual
  useEffect(() => {
    if (phase !== "playing" || locked) return;
    clearTimers();
    barKey.current += 1;
    deadline.current = Date.now() + QUESTION_TIME * 1000;
    setTimeLeft(QUESTION_TIME);
    const iv = setInterval(() => {
      const left = Math.max(0, (deadline.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) clearInterval(iv);
    }, 100);
    timers.current.push(iv as unknown as ReturnType<typeof setTimeout>);
    for (let s = 3; s >= 1; s--) timers.current.push(setTimeout(() => sfxTick(), (QUESTION_TIME - s) * 1000));
    timers.current.push(setTimeout(() => handleAnswer(-1), QUESTION_TIME * 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIndex, locked]);

  function handleAnswer(optIndex: number) {
    if (locked || phase !== "playing") return;
    clearTimers(); setLocked(true); setChosen(optIndex);
    if (optIndex >= 0) sfxSelect();

    const isCorrect = optIndex === q.correctIndex;
    const frac = Math.max(0, Math.min(1, (deadline.current - Date.now()) / (QUESTION_TIME * 1000)));
    const newAnswered = answered + 1;
    setAnswered(newAnswered);

    if (isCorrect) {
      const newStreak = streak + 1;
      const m = multOf(newStreak);
      const pts = Math.round((COIN_BASE + Math.round(COIN_SPEED_BONUS * frac)) * m);
      const newScore = score + pts, newCorrect = correctCount + 1;
      if (m > mult) setMultBump((b) => b + 1); // subió el multiplicador → animación
      setGained(pts); setScore(newScore); setStreak(newStreak);
      setMaxStreak((v) => Math.max(v, newStreak)); setCorrectCount(newCorrect); setMood("good");
      if (newStreak >= 3) sfxStreak(); else sfxCorrect();
      timers.current.push(setTimeout(() => nextOrEnd(lives, newScore, newCorrect, newAnswered), 1650));
    } else {
      const newLives = lives - 1;
      setLives(newLives); setStreak(0); setMood("bad"); setLostIndex(newLives);
      sfxWrong();
      timers.current.push(setTimeout(() => nextOrEnd(newLives, score, correctCount, newAnswered), 1900));
    }
  }

  function start() { initAudio(); startMusic(); setPhase("playing"); }
  function toggleMute() { const m = !muted; setMuted(m); setMutedState(m); }
  function replay() {
    clearTimers(); setPhase("intro");
    setQIndex(0); setLives(LIVES); setScore(0); setStreak(0); setMaxStreak(0); setCorrectCount(0);
    setAnswered(0); setChosen(null); setLocked(false); setGained(0); setMood("idle"); setRecord(null); setMultBump(0); setLostIndex(null);
  }

  const isCorrect = locked && mood === "good";
  const isWrong = locked && mood === "bad";
  const timePct = Math.max(0, Math.min(100, (timeLeft / QUESTION_TIME) * 100));
  const bookiLine = isCorrect ? (mult > 1 ? `¡Estás on fire! Racha ${streak}` : "¡Esa es! Bien ahí")
    : isWrong ? "Uff… casi. Fijate en el apunte"
    : low ? "¡Rápido, se va el tiempo!" : "Leé bien y elegí, ¡vos podés!";
  const multLabel = "x" + (mult === 1.5 ? "1.5" : mult);

  return (
    <div className="gc-root" style={{ position: "fixed", inset: 0, zIndex: 500, color: "#fff", fontFamily: "var(--po, system-ui)", overflow: "hidden", userSelect: "none", WebkitTapHighlightColor: "transparent" }}>
      <style>{GC_CSS}</style>
      <GameBackground heat={heat} />

      {/* topbar salir + mute */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 8, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "max(12px, env(safe-area-inset-top)) 14px 12px" }}>
        <Link href={`/app/ia?note_id=${noteId}`} onClick={() => { clearTimers(); setMusicWanted(false); }} className="gc-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.85)", textDecoration: "none", fontSize: 13.5, fontWeight: 600, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 999, padding: "7px 14px", backdropFilter: "blur(6px)" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
          Salir
        </Link>
        <button onClick={toggleMute} aria-label={muted ? "Activar sonido" : "Silenciar"} className="gc-btn" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, color: "#fff", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 12, backdropFilter: "blur(6px)" }}>
          {muted
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="m23 9-6 6M17 9l6 6" /></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></svg>}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {phase === "intro" && <IntroScreen key="intro" noteTitle={noteTitle} bestScore={bestScore} onStart={start} reduce={!!reduce} />}

        {phase === "playing" && q && (
          <div key="play" style={{ position: "absolute", inset: 0, zIndex: 2, width: "100%", maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8, padding: "calc(50px + env(safe-area-inset-top)) 12px max(8px, env(safe-area-inset-bottom))", overflow: "hidden" }}>
            <div style={{ display: "contents" }}>

              {/* HUD */}
              <div style={{ position: "relative", flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 18, background: "linear-gradient(140deg,rgba(255,255,255,.15),rgba(255,255,255,.05))", border: "1px solid rgba(255,255,255,.18)", backdropFilter: "blur(12px)", boxShadow: "0 12px 28px rgba(20,0,50,.4)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 9px 4px 5px", borderRadius: 999, background: "rgba(0,0,0,.26)", flexShrink: 0 }}>
                  <Coin3D size={22} />
                  <motion.div key={score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 14 }} style={{ fontFamily: F, fontWeight: 800, fontSize: 18, lineHeight: 1, minWidth: 34 }}>{score.toLocaleString("es-AR")}</motion.div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "1.1px", color: "rgba(255,255,255,.55)" }}>VIDAS</div>
                  <div style={{ display: "flex", gap: 1, flexWrap: "nowrap", overflow: "hidden" }}>
                    {Array.from({ length: LIVES }).map((_, i) => {
                      const alive = i < lives;
                      return <span key={i} style={{ fontSize: 13, lineHeight: 1, color: alive ? "#ff4d79" : "#5b2f6b", textShadow: alive ? "0 2px 8px rgba(255,77,121,.6)" : "none", opacity: alive ? 1 : 0.38, animation: (!alive && lostIndex === i) ? "gcHeartOut .55s cubic-bezier(.3,1.4,.4,1) both" : "none" }}>♥</span>;
                    })}
                  </div>
                </div>
                {/* racha con fuego */}
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, padding: "6px 12px 6px 8px", borderRadius: 999, background: mult === 2 ? "linear-gradient(100deg,#f59e0b,#dc2626)" : mult === 1.5 ? "linear-gradient(100deg,#fb923c,#ea580c)" : "rgba(0,0,0,.26)", boxShadow: mult === 2 ? "0 8px 26px rgba(249,115,22,.75),0 0 0 2px rgba(253,224,71,.55)" : mult === 1.5 ? "0 6px 18px rgba(249,115,22,.5)" : "none", transition: "background .4s ease, box-shadow .4s ease" }}>
                  <div style={{ position: "relative", width: 13 + heat * 11, height: 18 + heat * 16, animation: reduce ? "none" : "gcFlame .7s ease-in-out infinite", filter: `drop-shadow(0 0 ${3 + heat * 10}px rgba(249,115,22,.9))` }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#fde047,#f97316 45%,#dc2626)", clipPath: "polygon(50% 0,78% 28%,70% 44%,92% 66%,74% 100%,26% 100%,8% 66%,30% 44%,22% 28%)" }} />
                    <div style={{ position: "absolute", left: "28%", right: "28%", bottom: "6%", top: "46%", background: "linear-gradient(180deg,#fff7cd,#fbbf24)", borderRadius: "50% 50% 44% 44%", opacity: 0.9 }} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                    <div key={multBump} style={{ fontFamily: F, fontWeight: 800, fontSize: 18, color: mult === 2 ? "#fde047" : mult === 1.5 ? "#ffedd5" : "#fff", textShadow: mult === 2 ? "0 0 14px rgba(253,224,71,.95)" : mult === 1.5 ? "0 0 10px rgba(251,146,60,.8)" : "none", animation: multBump ? "gcMultBoom .55s cubic-bezier(.22,1.6,.4,1)" : "none" }}>{multLabel}</div>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,.72)" }}>RACHA {streak}</div>
                  </div>
                  {streak >= 3 && Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{ position: "absolute", left: "22%", top: "50%", width: 5, height: 5, borderRadius: "50%", background: i % 2 ? "#fde047" : "#fb923c", boxShadow: "0 0 8px rgba(251,146,60,.9)", pointerEvents: "none", ["--sx" as string]: `${(Math.cos(i * 0.9) * 38).toFixed(0)}px`, ["--sy" as string]: `${(-18 - Math.random() * 34).toFixed(0)}px`, animation: reduce ? "none" : `gcSpark ${(0.9 + Math.random() * 0.7).toFixed(2)}s ease-out ${(i * 0.16).toFixed(2)}s infinite` }} />
                  ))}
                </div>
              </div>

              {/* timer */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ height: 14, borderRadius: 999, background: "rgba(0,0,0,.32)", overflow: "hidden", border: "1px solid rgba(255,255,255,.14)", boxShadow: "inset 0 2px 6px rgba(0,0,0,.35)" }}>
                  <div style={{ height: "100%", width: locked ? `${timePct}%` : `${timePct}%`, borderRadius: 999, background: low ? "linear-gradient(90deg,#f97316,#ef4444)" : "linear-gradient(90deg,#8b5cf6,#4f7dff 55%,#22d3ee)", boxShadow: `0 0 16px ${low ? "rgba(239,68,68,.75)" : "rgba(139,92,246,.8)"}`, transition: "width .1s linear", animation: (low && !locked && !reduce) ? "gcLowTime .7s ease-in-out infinite" : "none" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, padding: "0 3px" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", color: "rgba(255,255,255,.5)", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>Apunte · {noteTitle}</div>
                  <div style={{ fontFamily: F, fontWeight: 800, fontSize: 14, color: low ? "rgba(239,68,68,.9)" : "rgba(139,92,246,.9)" }}>{Math.ceil(timeLeft)}s</div>
                </div>
              </div>

              {/* Booki + bocadillo */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ marginBottom: -4 }}><Booki mood={isCorrect ? "good" : isWrong ? "bad" : "idle"} scale={0.66} /></div>
                <div key={bookiLine} style={{ flex: 1, padding: "9px 13px", borderRadius: "16px 16px 16px 4px", background: "rgba(255,255,255,.94)", color: "#2b1055", fontFamily: F, fontWeight: 700, fontSize: "clamp(12.5px,3.6vw,15px)", lineHeight: 1.18, boxShadow: "0 8px 20px rgba(20,0,50,.32)", animation: "gcPopIn .35s cubic-bezier(.22,1.5,.4,1) both" }}>{bookiLine}</div>
              </div>

              {/* pregunta */}
              <div style={{ position: "relative", flexShrink: 0, padding: "12px 14px", borderRadius: 18, background: "linear-gradient(140deg,rgba(255,255,255,.17),rgba(255,255,255,.06))", border: "1px solid rgba(255,255,255,.22)", backdropFilter: "blur(14px)", boxShadow: "0 14px 34px rgba(20,0,50,.4)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, width: "38%", height: "100%", background: "linear-gradient(100deg,transparent,rgba(255,255,255,.13),transparent)", animation: reduce ? "none" : "gcSheen 4.5s ease-in-out infinite", pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ padding: "4px 10px", borderRadius: 999, background: "linear-gradient(90deg,#6d3bf2,#c1338f)", fontSize: 10.5, fontWeight: 700, letterSpacing: ".5px", whiteSpace: "nowrap" }}>Pregunta {qIndex + 1} de {questions.length}</div>
                  <div style={{ flex: 1, height: 4, borderRadius: 4, background: "rgba(255,255,255,.16)", overflow: "hidden" }}><div style={{ height: "100%", width: `${(qIndex / questions.length) * 100}%`, background: "rgba(255,255,255,.75)", borderRadius: 4, transition: "width .4s cubic-bezier(.22,1.4,.4,1)" }} /></div>
                </div>
                <div style={{ fontFamily: F, fontWeight: 700, fontSize: "clamp(15.5px,4.3vw,21px)", lineHeight: 1.2, letterSpacing: "-.2px" }}>{q.question}</div>
              </div>

              {/* opciones */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 7, flex: 1, minHeight: 0 }}>
                {q.options.map((opt, i) => {
                  const sp = SHAPES[i % 4];
                  const right = i === q.correctIndex, isChosen = i === chosen, revealed = locked;
                  let bg: string = sp.bg, shadow = `0 10px 22px rgba(${sp.sh},.5), inset 0 -5px 0 rgba(0,0,0,.22)`, anim = "none", opacity = 1;
                  if (revealed) {
                    if (right) { bg = "linear-gradient(140deg,#3ddc84,#12a150)"; shadow = "0 0 0 4px rgba(61,220,132,.35),0 14px 30px rgba(18,161,80,.6),inset 0 -5px 0 rgba(0,0,0,.2)"; anim = "gcPopBig .45s cubic-bezier(.22,1.6,.4,1) both"; }
                    else if (isChosen) { bg = "linear-gradient(140deg,#f87171,#dc2626)"; shadow = "0 14px 30px rgba(220,38,38,.55),inset 0 -5px 0 rgba(0,0,0,.2)"; anim = "gcShakeX .5s ease-in-out both"; }
                    else opacity = 0.34;
                  }
                  return (
                    <button key={i} className="gc-opt gc-btn" disabled={locked} onClick={() => handleAnswer(i)}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", minHeight: 0, flex: 1, borderRadius: 15, border: "1px solid rgba(255,255,255,.22)", background: bg, boxShadow: shadow, color: "#fff", opacity, animation: anim, transition: "opacity .25s ease, background .25s ease, transform .16s cubic-bezier(.22,1.5,.4,1)", cursor: revealed ? "default" : "pointer", overflow: "hidden" }}>
                      <span style={{ flex: "none", width: 28, height: 28, borderRadius: 9, background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ width: 14, height: 14, background: "#fff", clipPath: sp.clip === "none" ? undefined : sp.clip, borderRadius: sp.r, display: "block" }} />
                      </span>
                      <span style={{ flex: 1, textAlign: "left", fontFamily: F, fontWeight: 700, fontSize: "clamp(13px,3.7vw,16px)", lineHeight: 1.12, overflow: "hidden" }}>{opt}</span>
                      <span style={{ flex: "none", width: 22, height: 22, borderRadius: 7, background: "rgba(0,0,0,.22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 700, opacity: 0.85 }}>{["A", "B", "C", "D"][i]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* feedback correcto */}
            {isCorrect && (
              <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9, overflow: "hidden" }}>
                {conf.map((c, i) => (
                  <div key={i} style={{ position: "absolute", left: `${c.x}%`, top: "18%", width: c.s, height: c.round ? c.s : c.s * 0.5, background: c.col, borderRadius: c.round ? "50%" : 2, ["--cx" as string]: `${c.cx}px`, ["--cy" as string]: `${c.cy}px`, animation: reduce ? "none" : `gcConf ${c.dur}s cubic-bezier(.2,.6,.5,1) ${c.d}s both` }} />
                ))}
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ fontFamily: F, fontWeight: 800, fontSize: "clamp(34px,10vw,52px)", color: "#fff", textShadow: "0 6px 0 #16a34a,0 14px 30px rgba(0,0,0,.4)", animation: "gcPopBig .5s cubic-bezier(.22,1.6,.4,1) both" }}>¡Correcto!</div>
                  <div style={{ fontFamily: F, fontWeight: 800, fontSize: 22, color: "#fbbf24", textShadow: "0 3px 12px rgba(0,0,0,.5)", animation: "gcGainUp 1.5s ease-out both" }}>+{gained} monedas · {multLabel}</div>
                </div>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ position: "absolute", left: "50%", top: "55%", width: 24, height: 24, ["--dx" as string]: `${-120 + i * 6}px`, ["--dy" as string]: "-40vh", animation: reduce ? "none" : `gcCoinfly 1.05s cubic-bezier(.3,.1,.4,1) ${i * 0.07}s both` }}>
                    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "linear-gradient(145deg,#fff3c4,#f5b731 42%,#c9860c)", boxShadow: "0 4px 12px rgba(240,169,29,.6),inset 0 -3px 0 rgba(120,66,0,.4),inset 0 3px 0 rgba(255,255,255,.5)" }} />
                    <div style={{ position: "absolute", left: "50%", top: "50%", width: 11, height: 11, transform: "translate(-50%,-50%)", background: "linear-gradient(160deg,#fff6d0,#e8a81a)", clipPath: "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" }} />
                  </div>
                ))}
              </div>
            )}

            {/* feedback incorrecto */}
            {isWrong && (
              <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9, background: "radial-gradient(circle at 50% 45%,rgba(239,68,68,.22),transparent 62%)" }}>
                <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontFamily: F, fontWeight: 800, fontSize: "clamp(30px,9vw,46px)", color: "#fff", textShadow: "0 6px 0 #b91c1c,0 14px 30px rgba(0,0,0,.45)", whiteSpace: "nowrap", animation: "gcShakeX .55s ease-in-out both" }}>{chosen === -1 ? "¡Tiempo!" : "¡Uy!"} −1 vida</div>
              </div>
            )}
          </div>
        )}

        {phase === "over" && (
          <EndScreen key="over" noteId={noteId} noteTitle={noteTitle} score={score} correct={correctCount} answered={answered}
            maxStreak={maxStreak} record={record} onReplay={replay} reduce={!!reduce} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Intro ─────────────────────────
function IntroScreen({ noteTitle, bestScore, onStart, reduce }: { noteTitle: string; bestScore: number; onStart: () => void; reduce: boolean }) {
  return (
    <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ animation: reduce ? "none" : "gcFloaty 3.4s ease-in-out infinite" }}><Booki mood="cheer" scale={1.4} /></div>
      <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ fontFamily: F, fontSize: "clamp(30px,7.5vw,48px)", fontWeight: 800, letterSpacing: "-.02em", margin: "14px 0 6px", background: "linear-gradient(90deg,#c4b5fd,#818cf8,#f9a8d4)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Modo Juego
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        style={{ color: "rgba(255,255,255,.72)", fontSize: 15, maxWidth: 420, lineHeight: 1.5, margin: "0 0 22px" }}>
        Respondé rápido y sin errores. <b style={{ color: "#fff" }}>10 vidas</b>, ganás <b style={{ color: "#ffce6b" }}>monedas</b> por velocidad y racha. Tema: <b style={{ color: "#c4b5fd" }}>{noteTitle}</b>.
      </motion.p>
      {bestScore > 0 && (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.28 }}
          style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "rgba(255,176,32,.12)", border: "1px solid rgba(255,176,32,.35)", color: "#ffce6b", borderRadius: 999, padding: "9px 18px", fontWeight: 700, fontSize: 14, marginBottom: 22 }}>
          <Coin3D size={18} spin={3.5} /> Tu récord: {bestScore.toLocaleString("es-AR")} · ¿Lo superás?
        </motion.div>
      )}
      <motion.button onClick={onStart} className="gc-btn" whileHover={reduce ? undefined : { scale: 1.04 }} whileTap={{ scale: 0.94 }}
        style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 52px", borderRadius: 999, border: "none", color: "#fff", fontFamily: F, fontWeight: 800, fontSize: 21, cursor: "pointer", background: "linear-gradient(100deg,#6d3bf2,#9326cf 55%,#c1338f)", boxShadow: "0 14px 30px rgba(147,38,207,.55)", animation: reduce ? "none" : "gcGlow 1.5s ease-in-out infinite" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg> Jugar
      </motion.button>
    </motion.div>
  );
}

// ───────────────────────── Fin de partida (con cofre) ─────────────────────────
function EndScreen({ noteId, noteTitle, score, correct, answered, maxStreak, record, onReplay, reduce }: {
  noteId: string; noteTitle: string; score: number; correct: number; answered: number; maxStreak: number;
  record: { best: number; isRecord: boolean } | null; onReplay: () => void; reduce: boolean;
}) {
  const acc = answered ? Math.round((correct / answered) * 100) : 0;
  const prevRecord = record ? (record.isRecord ? Math.max(0, score) : record.best) : 0;
  const [step, setStep] = useState(0);          // 0 cerrado, 1 abre+monedas, 2 count-up
  const [coinsShown, setCoinsShown] = useState(0);
  const isNewRecord = !!record?.isRecord;

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 480);
    const t2 = setTimeout(() => {
      setStep(2);
      const t0 = Date.now(), dur = 1300;
      const iv = setInterval(() => {
        const k = Math.min(1, (Date.now() - t0) / dur);
        setCoinsShown(Math.round(score * (1 - Math.pow(1 - k, 3))));
        if (k >= 1) clearInterval(iv);
      }, 40);
    }, 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [score]);

  const endConf = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    x: Math.random() * 100, s: 6 + Math.random() * 9, col: CONF_COLORS[i % CONF_COLORS.length],
    cx: (Math.random() * 2 - 1) * 220, cy: 380 + Math.random() * 380, d: Math.random() * 0.35, dur: 1.5 + Math.random() * 1.2, round: Math.random() > 0.5,
  })), []);

  return (
    <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "absolute", inset: 0, zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }}>
      {step >= 1 && endConf.map((c, i) => (
        <div key={i} style={{ position: "fixed", left: `${c.x}%`, top: "10%", width: c.s, height: c.round ? c.s : c.s * 0.5, background: c.col, borderRadius: c.round ? "50%" : 2, zIndex: 5, pointerEvents: "none", ["--cx" as string]: `${c.cx}px`, ["--cy" as string]: `${c.cy}px`, animation: reduce ? "none" : `gcConf ${c.dur}s cubic-bezier(.2,.6,.5,1) ${c.d}s both` }} />
      ))}

      <div style={{ width: "100%", maxWidth: 600, padding: "58px 16px 24px", display: "flex", flexDirection: "column", gap: 14, animation: "gcPopIn .5s cubic-bezier(.22,1.4,.4,1) both" }}>
        <div style={{ textAlign: "center", fontFamily: F, fontWeight: 800, fontSize: "clamp(28px,7.5vw,40px)", lineHeight: 1.05, letterSpacing: "-.5px" }}>¡Partida terminada!</div>
        <div style={{ textAlign: "center", marginTop: -10, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.62)" }}>{noteTitle}</div>

        {/* Booki + cofre */}
        <div style={{ position: "relative", height: "clamp(230px,54vw,286px)", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
          <div style={{ position: "absolute", left: "50%", top: "46%", width: 230, height: 230, transform: "translate(-50%,-50%)", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,201,84,.85),transparent 66%)", filter: "blur(18px)", opacity: step >= 1 ? 1 : 0, transition: "opacity .6s ease", pointerEvents: "none" }} />
          <div style={{ position: "relative", zIndex: 2, marginBottom: 6 }}><Booki mood="cheer" /></div>
          {/* cofre */}
          <div style={{ position: "relative", zIndex: 2, flex: "none", width: "clamp(150px,42vw,180px)", height: 150, perspective: 600 }}>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 86, borderRadius: "12px 12px 16px 16px", background: "linear-gradient(170deg,#8b5a2b,#5b3517)", boxShadow: "0 20px 40px rgba(0,0,0,.5),inset 0 -6px 0 rgba(0,0,0,.28)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, height: 14, background: "linear-gradient(180deg,#f6c453,#c98b1b)", boxShadow: "0 3px 8px rgba(0,0,0,.3)" }} />
            <div style={{ position: "absolute", left: "50%", bottom: 16, transform: "translateX(-50%)", width: 26, height: 30, borderRadius: 6, background: "linear-gradient(160deg,#ffe08a,#d19a1c)", boxShadow: "0 4px 10px rgba(0,0,0,.4)", zIndex: 3 }} />
            <div style={{ position: "absolute", left: 8, right: 8, bottom: 74, height: 26, borderRadius: 8, background: "radial-gradient(ellipse at 50% 100%,rgba(255,214,102,1),rgba(255,170,40,.25) 70%,transparent)", opacity: step >= 1 ? 1 : 0, transition: "opacity .5s ease", filter: "blur(3px)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 78, height: 60, transformOrigin: "bottom center", transformStyle: "preserve-3d", animation: step >= 1 && !reduce ? "gcLidOpen .9s cubic-bezier(.3,1.3,.4,1) both" : "none", transform: step >= 1 && reduce ? "rotateX(-108deg)" : undefined }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "26px 26px 6px 6px", background: "linear-gradient(170deg,#a06a33,#6b3f1c)", boxShadow: "0 -6px 18px rgba(0,0,0,.4),inset 0 4px 0 rgba(255,255,255,.14)" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 12, background: "linear-gradient(180deg,#f6c453,#c98b1b)" }} />
            </div>
          </div>
          {/* monedas volando al cofre */}
          {step >= 1 && Array.from({ length: 12 }).map((_, i) => {
            const lx = 12 + Math.random() * 76;
            return <div key={i} style={{ position: "absolute", left: `${lx}%`, top: "-10%", width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(145deg,#fff3c4,#f5b731 42%,#c9860c)", boxShadow: "0 4px 12px rgba(240,169,29,.6),inset 0 -3px 0 rgba(120,66,0,.4)", zIndex: 1, ["--dx" as string]: `${(50 - lx) * 1.6}px`, ["--dy" as string]: "170px", animation: reduce ? "none" : `gcCoinToChest 1s cubic-bezier(.4,.1,.5,1) ${0.25 + i * 0.09}s both` }} />;
          })}
        </div>

        {isNewRecord && (
          <div style={{ position: "relative", alignSelf: "center", marginTop: 2, padding: "12px 24px", borderRadius: 20, background: "linear-gradient(100deg,#fbbf24,#f97316 60%,#ec4899)", color: "#3b1200", fontFamily: F, fontWeight: 800, fontSize: "clamp(18px,5vw,24px)", letterSpacing: ".5px", boxShadow: "0 14px 34px rgba(249,115,22,.55),inset 0 -4px 0 rgba(0,0,0,.18)", animation: "gcPopBig .6s cubic-bezier(.22,1.6,.4,1) both" }}>
            <div style={{ position: "absolute", left: "50%", top: -24, transform: "translateX(-50%)", width: 52, height: 30, background: "linear-gradient(180deg,#ffe08a,#e5a013)", clipPath: "polygon(0 100%,12% 26%,30% 62%,50% 8%,70% 62%,88% 26%,100% 100%)", boxShadow: "0 6px 14px rgba(0,0,0,.35)", animation: reduce ? "none" : "gcCrownBob 1.6s ease-in-out infinite" }} />
            ¡NUEVO RÉCORD!
          </div>
        )}

        {/* card resumen */}
        <div style={{ borderRadius: 28, padding: 20, background: "linear-gradient(140deg,rgba(255,255,255,.16),rgba(255,255,255,.06))", border: "1px solid rgba(255,255,255,.22)", backdropFilter: "blur(14px)", boxShadow: "0 22px 50px rgba(30,0,70,.5)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1.6px", color: "rgba(255,255,255,.6)" }}>MONEDAS GANADAS</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Coin3D size={44} spin={3.2} />
              <div style={{ fontFamily: F, fontWeight: 800, fontSize: "clamp(42px,12vw,60px)", lineHeight: 1, textShadow: "0 6px 24px rgba(251,191,36,.5)" }}>{coinsShown.toLocaleString("es-AR")}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(118px,1fr))", gap: 10 }}>
            {[
              { l: "PRECISIÓN", v: `${acc}%`, sub: `${correct} de ${answered}`, c: "#34d399" },
              { l: "MEJOR RACHA", v: `${maxStreak}`, sub: "seguidas", c: "#fbbf24" },
              { l: "RÉCORD ANTERIOR", v: `${prevRecord.toLocaleString("es-AR")}`, sub: "monedas", c: "rgba(255,255,255,.85)" },
            ].map((s) => (
              <div key={s.l} style={{ borderRadius: 20, padding: 14, background: "rgba(0,0,0,.22)", display: "flex", flexDirection: "column", gap: 3, alignItems: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1.2px", color: "rgba(255,255,255,.6)" }}>{s.l}</div>
                <div style={{ fontFamily: F, fontWeight: 800, fontSize: 26, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.5)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={onReplay} className="gc-btn" style={{ width: "100%", padding: 19, borderRadius: 22, background: "linear-gradient(100deg,#6d3bf2,#9326cf 55%,#c1338f)", color: "#fff", fontFamily: F, fontWeight: 800, fontSize: 21, border: "none", boxShadow: "0 14px 30px rgba(147,38,207,.55),inset 0 -4px 0 rgba(0,0,0,.2)", cursor: "pointer" }}>Jugar de nuevo</button>
          <Link href={`/app/ia?note_id=${noteId}`} className="gc-btn" style={{ width: "100%", padding: 17, borderRadius: 22, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.26)", color: "#fff", fontFamily: F, fontWeight: 700, fontSize: 18, textAlign: "center", textDecoration: "none", backdropFilter: "blur(10px)", boxSizing: "border-box" }}>Volver</Link>
        </div>
      </div>
    </motion.div>
  );
}

const GC_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap');
.gc-root, .gc-root * { box-sizing: border-box; }
.gc-opt:not(:disabled):hover { filter: brightness(1.08); }
.gc-btn { cursor: pointer; }
@keyframes gcBlobA{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(8%,-10%,0) scale(1.18)}}
@keyframes gcBlobB{0%,100%{transform:translate3d(0,0,0) scale(1.05)}50%{transform:translate3d(-10%,8%,0) scale(.9)}}
@keyframes gcBlobC{0%,100%{transform:translate3d(0,0,0) scale(.95)}50%{transform:translate3d(6%,10%,0) scale(1.2)}}
@keyframes gcPopIn{0%{transform:scale(.82) translateY(16px);opacity:0}58%{transform:scale(1.03) translateY(0);opacity:1}80%{transform:scale(.99)}100%{transform:scale(1)}}
@keyframes gcPopBig{0%{transform:scale(.5);opacity:0}55%{transform:scale(1.12);opacity:1}75%{transform:scale(.96)}100%{transform:scale(1)}}
@keyframes gcMultBoom{0%{transform:scale(.4) rotate(-12deg);filter:brightness(2.4)}45%{transform:scale(1.55) rotate(6deg)}70%{transform:scale(.92)}100%{transform:scale(1) rotate(0);filter:brightness(1)}}
@keyframes gcShakeX{0%,100%{transform:translateX(0)}12%{transform:translateX(-11px)}28%{transform:translateX(9px)}44%{transform:translateX(-7px)}62%{transform:translateX(5px)}80%{transform:translateX(-3px)}}
@keyframes gcConf{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}100%{transform:translate3d(var(--cx),var(--cy),0) rotate(720deg);opacity:0}}
@keyframes gcCoinfly{0%{transform:translate3d(0,0,0) scale(.6);opacity:0}18%{transform:translate3d(0,-18px,0) scale(1.15);opacity:1}100%{transform:translate3d(var(--dx),var(--dy),0) scale(.45);opacity:0}}
@keyframes gcCoinToChest{0%{transform:translate3d(0,0,0) scale(1);opacity:0}12%{opacity:1}100%{transform:translate3d(var(--dx),var(--dy),0) scale(.35);opacity:0}}
@keyframes gcCoinSpin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
@keyframes gcGainUp{0%{transform:translateY(10px) scale(.6);opacity:0}30%{transform:translateY(-6px) scale(1.15);opacity:1}70%{opacity:1}100%{transform:translateY(-46px) scale(1);opacity:0}}
@keyframes gcFloaty{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}
@keyframes gcCheer{0%,100%{transform:translateY(0) rotate(-7deg) scale(1)}50%{transform:translateY(-16px) rotate(7deg) scale(1.07)}}
@keyframes gcJumpJoy{0%,100%{transform:translateY(0) scale(1,1)}18%{transform:translateY(4px) scale(1.08,.9)}45%{transform:translateY(-30px) scale(.94,1.1)}70%{transform:translateY(0) scale(1.06,.94)}}
@keyframes gcWobble{0%,100%{transform:rotate(0) translateY(0)}25%{transform:rotate(-5deg) translateY(3px)}75%{transform:rotate(4deg) translateY(3px)}}
@keyframes gcHeartOut{0%{transform:scale(1);opacity:1}35%{transform:scale(1.5)}100%{transform:scale(.85);opacity:.22;filter:grayscale(1)}}
@keyframes gcFlame{0%,100%{transform:scale(1,1) translateY(0);filter:hue-rotate(0)}35%{transform:scale(1.14,.92) translateY(1px)}60%{transform:scale(.92,1.14) translateY(-2px);filter:hue-rotate(-12deg)}}
@keyframes gcSpark{0%{transform:translate3d(0,0,0) scale(1);opacity:1}100%{transform:translate3d(var(--sx),var(--sy),0) scale(.2);opacity:0}}
@keyframes gcAuraPulse{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes gcSheen{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}
@keyframes gcLowTime{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes gcLidOpen{0%{transform:rotateX(0)}60%{transform:rotateX(-118deg)}80%{transform:rotateX(-98deg)}100%{transform:rotateX(-108deg)}}
@keyframes gcCrownBob{0%,100%{transform:translateX(-50%) translateY(0) rotate(-4deg)}50%{transform:translateX(-50%) translateY(-6px) rotate(4deg)}}
@keyframes gcGlow{0%,100%{box-shadow:0 12px 40px rgba(99,60,220,.55)}50%{box-shadow:0 16px 60px rgba(150,110,255,.95),0 0 0 7px rgba(139,92,246,.16)}}
@media(prefers-reduced-motion:reduce){.gc-root *{animation:none !important}}
`;
