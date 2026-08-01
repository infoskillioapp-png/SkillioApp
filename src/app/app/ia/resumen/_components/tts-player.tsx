"use client";

import { useEffect, useRef, useState } from "react";

// Reproductor del resumen en audio (Google TTS, voz masculina es-US-Neural2-B).
// Solo audio + controles; los subtítulos viven en la pantalla dedicada
// "Escuchar Resumen" (Claude Design).

type Status = "idle" | "loading" | "ready" | "error";
const RATES = [1, 1.25, 1.5, 2] as const;

function fmt(s: number): string {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function TtsPlayer({
  noteId,
  isPro,
  onUpsell,
}: {
  noteId: string;
  isPro: boolean;
  onUpsell: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function generate() {
    if (!isPro) { onUpsell(); return; }
    setStatus("loading"); setError("");
    try {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId }),
      });
      if (res.status === 402) { onUpsell(); setStatus("idle"); return; }
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || "No se pudo generar el audio");
      const a = audioRef.current!;
      a.src = j.url;
      a.playbackRate = rate;
      setStatus("ready");
      void a.play().then(() => setPlaying(true)).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
      setStatus("error");
    }
  }

  function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { void a.play(); setPlaying(true); }
    else { a.pause(); setPlaying(false); }
  }

  function setSpeed(r: number) {
    setRate(r);
    if (audioRef.current) audioRef.current.playbackRate = r;
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCur(a.currentTime);
    const onMeta = () => setDur(a.duration);
    const onEnd = () => { setPlaying(false); setCur(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const accent = "linear-gradient(135deg,#4f7dff,#3d63e0)"; // azul: distinto de Tarjetas (violeta)

  return (
    <div style={{ margin: "0 0 16px" }}>
      <audio ref={audioRef} preload="none" />

      {status === "idle" || status === "error" ? (
        <button
          onClick={generate}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            width: "100%", padding: "13px 16px", borderRadius: 14, border: "none", cursor: "pointer",
            background: accent, color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
            boxShadow: "0 6px 18px rgba(79,125,255,.30)",
          }}
        >
          🎧 Escuchar el resumen
          <span style={{ fontWeight: 500, opacity: .85, fontSize: 12 }}>· estudiá con los oídos</span>
        </button>
      ) : (
        <div style={{
          borderRadius: 18, padding: "14px 16px",
          background: "linear-gradient(135deg,rgba(79,125,255,.10),rgba(61,99,224,.06))",
          border: "1.5px solid rgba(79,125,255,.22)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={toggle}
              disabled={status === "loading"}
              aria-label={playing ? "Pausar" : "Reproducir"}
              style={{
                flexShrink: 0, width: 48, height: 48, borderRadius: "50%", border: "none",
                cursor: status === "loading" ? "default" : "pointer", background: accent, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 6px 16px rgba(79,125,255,.35)",
              }}
            >
              {status === "loading" ? (
                <svg width="22" height="22" viewBox="0 0 24 24" style={{ animation: "ttsSpin 0.9s linear infinite" }} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
              ) : playing ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.3" /><rect x="14" y="5" width="4" height="14" rx="1.3" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" /></svg>
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {status === "loading" ? "Preparando tu audio…" : "Resumen en audio"}
              </div>
              <input
                type="range" min={0} max={dur || 0} step={0.1} value={cur}
                onChange={(e) => { const t = +e.target.value; if (audioRef.current) audioRef.current.currentTime = t; setCur(t); }}
                style={{ width: "100%", accentColor: "#4f7dff", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                <span>{fmt(cur)}</span><span>{fmt(dur)}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {/* velocidad (del navegador, sin costo) */}
            {RATES.map((r) => (
              <button key={r} onClick={() => setSpeed(r)} style={chip(rate === r)}>{r}x</button>
            ))}
          </div>
        </div>
      )}

      {status === "error" && (
        <div style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}>{error}. Probá de nuevo.</div>
      )}
      <style>{`@keyframes ttsSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "5px 10px", borderRadius: 999, cursor: "pointer",
    border: active ? "1.5px solid #4f7dff" : "1.5px solid rgba(79,125,255,.25)",
    background: active ? "linear-gradient(135deg,#4f7dff,#3d63e0)" : "#fff",
    color: active ? "#fff" : "#3d63e0", fontFamily: "var(--po)", fontWeight: 700, fontSize: 11.5,
  };
}
