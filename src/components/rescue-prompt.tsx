"use client";

import { useState } from "react";

// Rescate del embudo anónimo (registro diferido): al cerrar el paywall sin
// pagar, ofrecemos mandar el resultado por mail para "no perderlo". Se usa
// tanto en la vista pública de resultado como en /app/ia/resumen para
// invitados.
export function RescuePrompt({
  noteId,
  onClose,
  onDone,
}: {
  noteId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setState("error");
      return;
    }
    setState("sending");
    try {
      const r = await fetch("/api/public/rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note_id: noteId }),
      });
      if (!r.ok) {
        setState("error");
        return;
      }
      setState("sent");
      setTimeout(onDone, 1600);
    } catch {
      setState("error");
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,8,28,.72)",
        backdropFilter: "blur(8px)",
        zIndex: 110,
        display: "flex",
        overflowY: "auto",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "min(420px,100%)",
          margin: "auto",
          padding: "24px 22px 22px",
          boxShadow: "0 24px 60px rgba(0,0,0,.3)",
          animation: "fadeUp .26s cubic-bezier(.22,1,.36,1) both",
        }}
      >
        {state === "sent" ? (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📬</div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 18, color: "var(--ink)", marginBottom: 6 }}>
              ¡Listo! Te lo mandamos
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>
              Revisá tu correo — te dejamos el link para volver a tu resumen.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 32, marginBottom: 10 }}>💾</div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 19, color: "var(--ink)", marginBottom: 6, lineHeight: 1.25 }}>
              ¿Te lo mandamos por mail para no perderlo?
            </div>
            <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.55, marginBottom: 16 }}>
              Te guardamos el resumen y te mandamos un link para volver cuando quieras, desde cualquier dispositivo.
            </div>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error") setState("idle");
              }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "13px 15px",
                fontSize: 15,
                borderRadius: 13,
                border: `1.5px solid ${state === "error" ? "#ff5b71" : "rgba(139,92,246,.28)"}`,
                outline: "none",
                marginBottom: state === "error" ? 6 : 12,
              }}
            />
            {state === "error" && (
              <div style={{ fontSize: 12.5, color: "#d63a52", marginBottom: 12, fontWeight: 600 }}>
                Revisá que el mail esté bien escrito.
              </div>
            )}
            <button
              onClick={submit}
              disabled={state === "sending"}
              style={{
                width: "100%",
                padding: "14px",
                border: "none",
                borderRadius: 14,
                background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                color: "#fff",
                fontFamily: "var(--po)",
                fontWeight: 700,
                fontSize: 15,
                cursor: state === "sending" ? "default" : "pointer",
                boxShadow: "0 8px 22px rgba(124,58,237,.28)",
                opacity: state === "sending" ? 0.7 : 1,
              }}
            >
              {state === "sending" ? "Enviando…" : "Mandámelo 📩"}
            </button>
            <button
              onClick={onClose}
              style={{ width: "100%", marginTop: 10, background: "none", border: "none", fontSize: 13, color: "var(--muted)", cursor: "pointer", opacity: 0.7 }}
            >
              No, gracias
            </button>
          </>
        )}
      </div>
    </div>
  );
}
