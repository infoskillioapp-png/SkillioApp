"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type Phase = "idle" | "uploading" | "generating" | "error";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.txt,.md,.doc,.docx,image/*,application/pdf,text/plain";

const GEN_MESSAGES = [
  "Leyendo tu apunte…",
  "Detectando los temas clave…",
  "Armando el resumen…",
  "Puliendo los detalles…",
];

function errorFor(status: number, code?: string): string {
  if (status === 413) return "El archivo pesa demasiado (máx. 25 MB).";
  if (status === 415) return "Ese tipo de archivo no lo podemos leer. Subí un PDF, una foto o un texto.";
  if (code === "free_limit_reached") return "Ya generaste tu resumen gratis.";
  return "No pudimos procesar el archivo. Probá de nuevo.";
}

export function GenerarClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [drag, setDrag] = useState(false);
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotamos mensajes durante la generación (la llamada puede tardar ~30s).
  useEffect(() => {
    if (phase !== "generating") return;
    const t = setInterval(() => setGenMsgIdx((i) => (i + 1) % GEN_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, [phase]);

  const handleFile = useCallback(
    async (file: File) => {
      setErrMsg("");
      setPhase("uploading");
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("title", file.name);

        const up = await fetch("/api/notes/upload", { method: "POST", body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok || !upData?.note?.id) {
          setPhase("error");
          setErrMsg(errorFor(up.status, upData?.error));
          return;
        }

        setGenMsgIdx(0);
        setPhase("generating");

        const gen = await fetch("/api/ai/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: upData.note.id, format: "puntos_clave" }),
        });
        const genData = await gen.json().catch(() => ({}));

        if (gen.status === 402 && genData?.error === "free_limit_reached") {
          // Ya generó antes (la página server debería haber redirigido). Reintentamos el redirect.
          router.push("/generar");
          return;
        }
        if (!gen.ok || !genData?.output_id) {
          setPhase("error");
          setErrMsg("No pudimos generar el resumen. Probá de nuevo en un momento.");
          return;
        }

        router.push(`/r/${genData.output_id}`);
      } catch {
        setPhase("error");
        setErrMsg("Algo salió mal. Revisá tu conexión y probá de nuevo.");
      }
    },
    [router],
  );

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  const busy = phase === "uploading" || phase === "generating";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px 64px",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(139,92,246,.16), transparent 60%), var(--bg)",
      }}
    >
      <div style={{ width: "min(560px, 100%)", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(139,92,246,.10)",
            border: "1px solid rgba(139,92,246,.22)",
            color: "#7c3aed",
            fontWeight: 700,
            fontSize: 12.5,
            padding: "6px 13px",
            borderRadius: 999,
            marginBottom: 18,
          }}
        >
          ✨ Sin registro · gratis
        </div>

        <h1
          style={{
            fontFamily: "var(--po)",
            fontWeight: 800,
            fontSize: "clamp(26px, 6vw, 38px)",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "0 0 12px",
          }}
        >
          Convertí tu apunte en un{" "}
          <span
            style={{
              background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            resumen para estudiar
          </span>
        </h1>
        <p style={{ fontSize: 15.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Subí tu PDF, foto o apunte y Booki te arma un resumen con los temas clave en segundos.
        </p>

        {/* Dropzone / estados */}
        {!busy && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            style={{
              cursor: "pointer",
              background: "var(--card)",
              border: `2px dashed ${drag ? "#8b5cf6" : "rgba(139,92,246,.35)"}`,
              borderRadius: 24,
              padding: "44px 24px",
              transition: "border-color .15s, transform .15s, box-shadow .15s",
              boxShadow: drag ? "0 16px 40px rgba(139,92,246,.20)" : "0 8px 30px rgba(31,35,71,.06)",
              transform: drag ? "translateY(-2px)" : "none",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: "0 auto 16px",
                borderRadius: 18,
                background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 10px 24px rgba(124,58,237,.32)",
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M6 10l6-6 6 6" />
                <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
            </div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 16.5, color: "var(--ink)", marginBottom: 5 }}>
              Soltá tu apunte acá o tocá para elegir
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>PDF, imagen o texto · hasta 25 MB</div>
            <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} style={{ display: "none" }} />
          </div>
        )}

        {busy && (
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 24,
              padding: "44px 24px",
              boxShadow: "0 8px 30px rgba(31,35,71,.06)",
            }}
          >
            <div className="gen-spinner" style={{ margin: "0 auto 18px" }} />
            <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 16, color: "var(--ink)", marginBottom: 6 }}>
              {phase === "uploading" ? "Subiendo tu apunte…" : GEN_MESSAGES[genMsgIdx]}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {phase === "uploading" ? "Un segundo…" : "Esto puede tardar unos segundos. No cierres la página."}
            </div>
          </div>
        )}

        {phase === "error" && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                background: "rgba(255,91,113,.08)",
                border: "1px solid rgba(255,91,113,.28)",
                color: "#d63a52",
                borderRadius: 14,
                padding: "12px 16px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {errMsg}
            </div>
            <button
              onClick={() => {
                setPhase("idle");
                setErrMsg("");
              }}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: "#7c3aed",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Probar de nuevo
            </button>
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 22, lineHeight: 1.5 }}>
          No te pedimos cuenta ni tarjeta. Tu resumen queda guardado para vos.
        </p>
      </div>

      <style>{`
        .gen-spinner {
          width: 46px; height: 46px; border-radius: 50%;
          border: 4px solid rgba(139,92,246,.18);
          border-top-color: #8b5cf6;
          animation: genSpin .8s linear infinite;
        }
        @keyframes genSpin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}
