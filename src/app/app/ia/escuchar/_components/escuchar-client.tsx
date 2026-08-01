"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Pantalla inmersiva "Escuchar resumen" (portada de Claude Design "Reproductor
// de audio Skillio Booki"). Booki en CSS: antena con glow, ojos que parpadean,
// boca que se mueve al hablar, anillos que laten con la reproducción. Cableada
// al TTS real (/api/ai/tts) + subtítulo en vivo (la frase que se está leyendo).

type Cue = { t: number; text: string };
type PlayState = "preparing" | "playing" | "paused" | "error";
type Voice = "f" | "m";
const SPEEDS = [1, 1.5, 2] as const;

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

// ---- Booki (personaje CSS) ----
function Booki({ mood, blink, mouthOpen }: { mood: PlayState; blink: boolean; mouthOpen: number }) {
  const preparing = mood === "preparing";
  const playing = mood === "playing";
  const paused = mood === "paused" || mood === "error";

  const eyeStyle: React.CSSProperties = {
    width: 24, height: blink ? 4 : 26, borderRadius: "14px 14px 16px 16px", background: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    boxShadow: "inset 0 -2px 3px rgba(0,0,0,.08)", transition: "height .09s ease",
  };
  const eye = (browLeft: boolean) => (
    <div style={{ position: "relative" }}>
      <div style={{ width: 10, height: 3, background: "#2a1250", borderRadius: 2, position: "absolute", top: -9, [browLeft ? "left" : "right"]: 2, transform: `rotate(${browLeft ? 6 : -6}deg)` }} />
      <div style={eyeStyle}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#2a1250", position: "relative", top: 2 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", position: "absolute", top: 1, left: 1 }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      width: 128, height: 128, borderRadius: 42, position: "relative", zIndex: 2,
      background: "linear-gradient(160deg,#a78bfa,#7c3aed 55%,#5b21b6)",
      boxShadow: "0 14px 30px -10px rgba(0,0,0,.5),inset 0 2px 3px rgba(255,255,255,.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* antena */}
      <div style={{ position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)", width: 4, height: 18, background: "rgba(255,255,255,.7)", borderRadius: 2 }} />
      <div style={{ position: "absolute", top: -30, left: "50%", transform: "translateX(-50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", animation: "ecAntenna 2.4s ease-in-out infinite" }} />
      {/* shimmer al preparar */}
      {preparing && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 42, overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, width: "60%", background: "linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent)", animation: "ecShimmer 1.6s linear infinite" }} />
        </div>
      )}
      {/* cara */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>{eye(true)}{eye(false)}</div>
        {preparing && <div style={{ width: 22, height: 11, borderRadius: "0 0 22px 22px", background: "#2a1250" }} />}
        {playing && (
          <div style={{ width: 34, height: Math.max(16, mouthOpen * 32), borderRadius: "6px 6px 18px 18px", background: "#fff", border: "2.5px solid #2a1250", position: "relative", overflow: "hidden", transition: "height .1s ease" }}>
            <div style={{ position: "absolute", bottom: 0, left: 5, right: 5, height: "45%", background: "#f472b6", borderRadius: "0 0 8px 8px" }} />
          </div>
        )}
        {paused && (
          <div style={{ width: 44, height: 24, borderRadius: "0 0 44px 44px", background: "#fff", border: "3px solid #2a1250", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", bottom: 0, left: 6, right: 6, height: 9, background: "#f472b6", borderRadius: "0 0 20px 20px" }} />
          </div>
        )}
      </div>
      {/* cachetes */}
      <div style={{ position: "absolute", left: 12, bottom: 32, width: 13, height: 8, borderRadius: 8, background: "rgba(236,72,153,.35)" }} />
      <div style={{ position: "absolute", right: 12, bottom: 32, width: 13, height: 8, borderRadius: 8, background: "rgba(236,72,153,.35)" }} />
    </div>
  );
}

export function EscucharClient({ noteId, topicLabel }: { noteId: string; topicLabel: string }) {
  const router = useRouter();
  const [playState, setPlayState] = useState<PlayState>("preparing");
  const [voice, setVoice] = useState<Voice>("f");
  const [speed, setSpeed] = useState<number>(1);
  const [elapsed, setElapsed] = useState(0);
  const [total, setTotal] = useState(0);
  const [cues, setCues] = useState<Cue[]>([]);
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0.2);
  const [errorMsg, setErrorMsg] = useState("");
  const [needsPro, setNeedsPro] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stateLabel = playState === "preparing" ? "Preparando tu audio…"
    : playState === "playing" ? "Reproduciendo"
    : playState === "error" ? "No se pudo generar" : "En pausa";

  // Frase actual (subtítulo en vivo).
  const activeCue = useMemo(() => {
    let text = "";
    for (const c of cues) { if (c.t <= elapsed + 0.12) text = c.text; else break; }
    return text;
  }, [cues, elapsed]);

  async function generate(v: Voice) {
    setPlayState("preparing"); setErrorMsg(""); setElapsed(0); setCues([]);
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId, voice: v }),
      });
      if (res.status === 402) { setNeedsPro(true); setPlayState("error"); return; }
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || "Error");
      setCues(Array.isArray(j.cues) ? j.cues : []);
      const a = audioRef.current!;
      a.src = j.url;
      a.playbackRate = speed;
      await a.play();
      setPlayState("playing");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Error");
      setPlayState("error");
    }
  }

  // Auto-genera al abrir la pantalla.
  useEffect(() => { generate("f"); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Eventos del audio.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setElapsed(a.currentTime);
    const onMeta = () => setTotal(a.duration);
    const onEnd = () => setPlayState("paused");
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  // Parpadeo.
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>, t2: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t1 = setTimeout(() => {
        setBlink(true);
        t2 = setTimeout(() => { setBlink(false); schedule(); }, 140);
      }, 2200 + Math.random() * 2600);
    };
    schedule();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Boca animada mientras reproduce.
  useEffect(() => {
    if (playState !== "playing") { setMouthOpen(0.18); return; }
    const id = setInterval(() => {
      const t = Date.now() / 260;
      const v = 0.32 + 0.28 * Math.sin(t) + 0.22 * Math.sin(t * 2.1);
      setMouthOpen(Math.max(0.12, Math.min(1, v)));
    }, 90);
    return () => clearInterval(id);
  }, [playState]);

  function togglePlay() {
    if (playState === "preparing") return;
    if (playState === "error") { generate(voice); return; }
    const a = audioRef.current;
    if (!a) return;
    if (playState === "playing") { a.pause(); setPlayState("paused"); }
    else { void a.play(); setPlayState("playing"); }
  }

  function pickSpeed(s: number) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  function pickVoice(v: Voice) {
    if (v === voice) return;
    setVoice(v);
    generate(v); // otra voz = otro audio (cacheado por voz)
  }

  function goBack() {
    const a = audioRef.current;
    if (a) a.pause();
    router.push(`/app/ia?note_id=${noteId}`);
  }

  const isPlaying = playState === "playing";
  const progressPct = total ? Math.min(100, (elapsed / total) * 100) : 0;

  const glassChip = (active: boolean): React.CSSProperties => ({
    padding: "10px 18px", borderRadius: 999, fontFamily: "var(--po)", fontWeight: 600, fontSize: 13,
    cursor: "pointer", transition: "all .15s ease", color: active ? "#fff" : "#5b21b6",
    background: active ? "rgba(124,58,237,.55)" : "rgba(124,58,237,.12)",
    backdropFilter: "blur(10px) saturate(180%)", WebkitBackdropFilter: "blur(10px) saturate(180%)",
    border: active ? "1px solid rgba(124,58,237,.6)" : "1px solid rgba(124,58,237,.22)",
    boxShadow: active ? "inset 1.5px 1.5px 1px rgba(255,255,255,.35), 0 4px 12px -2px rgba(124,58,237,.4)" : "inset 1.5px 1.5px 1px rgba(255,255,255,.5)",
  });
  const chip = (active: boolean): React.CSSProperties => ({
    padding: "10px 16px", borderRadius: 999, fontFamily: "var(--po)", fontWeight: 600, fontSize: 13,
    cursor: "pointer", transition: "all .15s ease", background: active ? "#7c3aed" : "rgba(124,58,237,.08)",
    color: active ? "#fff" : "#5b21b6", border: active ? "none" : "1px solid rgba(124,58,237,.18)",
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, overflow: "hidden", background: "#FBFAFF" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&display=swap');
        @keyframes ecAura{0%{transform:translate(0,0) scale(1)}50%{transform:translate(-3%,2%) scale(1.06)}100%{transform:translate(0,0) scale(1)}}
        @keyframes ecRing{0%{transform:scale(.75);opacity:.6}100%{transform:scale(1.85);opacity:0}}
        @keyframes ecAntenna{0%,100%{box-shadow:0 0 6px 2px rgba(255,255,255,.6)}50%{box-shadow:0 0 15px 5px rgba(255,255,255,.9)}}
        @keyframes ecShimmer{0%{transform:translateX(-140%)}100%{transform:translateX(140%)}}
        @keyframes ecDot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.6}}
      `}</style>
      <audio ref={audioRef} preload="none" />

      {/* aura de fondo */}
      <div style={{ position: "absolute", inset: "-25%", filter: "blur(46px)", animation: "ecAura 11s ease-in-out infinite",
        background: "radial-gradient(circle at 28% 22%,rgba(167,139,250,.4) 0%,transparent 60%),radial-gradient(circle at 74% 60%,rgba(236,72,153,.16) 0%,transparent 55%),radial-gradient(circle at 46% 94%,rgba(124,58,237,.22) 0%,transparent 60%),#FBFAFF" }} />

      <div style={{ position: "relative", zIndex: 2, height: "100%", display: "flex", flexDirection: "column",
        padding: "max(22px, env(safe-area-inset-top)) 22px max(24px, env(safe-area-inset-bottom))", boxSizing: "border-box", maxWidth: 460, margin: "0 auto" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={goBack} aria-label="Volver" style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(124,58,237,.08)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <svg width="10" height="16" viewBox="0 0 10 16"><path d="M9 1L1.5 8L9 15" stroke="#4c1d95" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div style={{ flex: 1, textAlign: "center", marginRight: 40 }}>
            <div style={{ fontFamily: "'Baloo 2',var(--po)", fontWeight: 700, fontSize: 15, color: "#1E1330" }}>Escuchar resumen</div>
            <div style={{ fontFamily: "var(--po)", fontSize: 11.5, color: "#7c6f94", marginTop: 2 }}>{topicLabel}</div>
          </div>
        </div>

        {/* centro: estado + Booki + subtítulo */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, minHeight: 0 }}>
          <div style={{ fontFamily: "var(--po)", fontWeight: 600, fontSize: 13.5, color: "#5b21b6", letterSpacing: ".3px" }}>{stateLabel}</div>
          <div style={{ position: "relative", width: 288, height: 288, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ position: "absolute", top: "50%", left: "50%", marginLeft: -75, marginTop: -75, width: 150, height: 150, borderRadius: "50%", border: "1.5px solid rgba(124,58,237,.4)", opacity: isPlaying ? 1 : 0, transition: "opacity .4s ease", animation: isPlaying ? `ecRing 2.6s ease-out ${i * 0.7}s infinite` : "none" }} />
            ))}
            <Booki mood={playState} blink={blink} mouthOpen={mouthOpen} />
          </div>
          {/* subtítulo en vivo */}
          <div style={{ minHeight: 44, maxWidth: 320, textAlign: "center", padding: "0 4px", display: "flex", alignItems: "center" }}>
            {needsPro ? (
              <span style={{ fontFamily: "var(--po)", fontSize: 13.5, color: "#7c6f94" }}>El audio del resumen es una función PRO.</span>
            ) : playState === "error" ? (
              <span style={{ fontFamily: "var(--po)", fontSize: 13, color: "#dc2626" }}>{errorMsg || "Error"}. Tocá play para reintentar.</span>
            ) : activeCue ? (
              <span style={{ fontFamily: "var(--po)", fontWeight: 600, fontSize: 15.5, lineHeight: 1.4, color: "#3b0f6e", transition: "opacity .2s" }}>{activeCue}</span>
            ) : null}
          </div>
        </div>

        {/* controles */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {needsPro ? (
            <button onClick={() => router.push(`/app/ia/resumen?note_id=${noteId}`)} style={{ width: "100%", padding: "14px", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, boxShadow: "0 8px 20px rgba(124,58,237,.3)" }}>
              ⚡ Desbloquear con PRO
            </button>
          ) : (
            <>
              <button onClick={togglePlay} aria-label={isPlaying ? "Pausar" : "Reproducir"} style={{ width: 76, height: 76, borderRadius: "50%", border: "none", cursor: "pointer", alignSelf: "center", background: "linear-gradient(145deg,#c4b5fd,#7c3aed 55%,#5b21b6)", boxShadow: "0 10px 24px -6px rgba(124,58,237,.7),inset 0 1px 2px rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {playState === "preparing" ? (
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", animation: "ecDot 1s ease-in-out infinite" }} />
                ) : isPlaying ? (
                  <div style={{ display: "flex", gap: 6 }}><div style={{ width: 7, height: 26, borderRadius: 3, background: "#fff" }} /><div style={{ width: 7, height: 26, borderRadius: 3, background: "#fff" }} /></div>
                ) : (
                  <div style={{ width: 0, height: 0, borderStyle: "solid", borderWidth: "13px 0 13px 20px", borderColor: "transparent transparent transparent #fff", marginLeft: 4 }} />
                )}
              </button>
              <div>
                <div style={{ width: "100%", height: 6, borderRadius: 6, background: "rgba(124,58,237,.12)", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(90deg,#a855f7,#7c3aed)", width: `${progressPct}%`, transition: "width .3s linear" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "var(--po)", fontSize: 11.5, color: "#7c6f94" }}>
                  <span>{fmt(elapsed)}</span><span>{fmt(total)}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                {SPEEDS.map((s) => (
                  <div key={s} onClick={() => pickSpeed(s)} style={glassChip(speed === s)}>{s}x</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <div onClick={() => pickVoice("f")} style={chip(voice === "f")}>Femenina</div>
                <div onClick={() => pickVoice("m")} style={chip(voice === "m")}>Masculina</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
