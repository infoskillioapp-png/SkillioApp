"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SHOW_DELAY   = 12_000;  // 12s antes de auto-abrir
const STORAGE_KEY  = "skillio_feedback_ts";
const COOLDOWN_MS  = 7 * 24 * 60 * 60 * 1000; // 1 semana

const PANEL_W = 284; // ancho del panel en px
const TAB_W   = 30;  // ancho de la solapa en px

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24"
      fill={filled ? "#F4C969" : "none"}
      stroke={filled ? "#F4C969" : "#c2c4d8"}
      strokeWidth="1.6">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen]         = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating]     = useState(0);
  const [hovered, setHovered]   = useState(0);
  const [comment, setComment]   = useState("");
  const [loading, setLoading]   = useState(false);

  // Auto-abrir una vez por semana
  useEffect(() => {
    const last = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
    if (Date.now() - last < COOLDOWN_MS) return;
    const t = setTimeout(() => setOpen(true), SHOW_DELAY);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setOpen(false);
    // Guardar timestamp para no volver a auto-abrir hasta la próxima semana
    if (!submitted) localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  async function handleSubmit() {
    if (!rating) return;
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, page: pathname }),
      });
      setSubmitted(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      setTimeout(() => { setOpen(false); setSubmitted(false); setRating(0); setComment(""); }, 2200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        transform: "translateY(-50%)",
        // cuando está cerrado solo asoma la solapa (TAB_W px), el panel queda fuera de pantalla
        right: open ? 0 : -(PANEL_W),
        zIndex: 200,
        display: "flex",
        alignItems: "stretch",
        transition: "right .32s cubic-bezier(.4,0,.2,1)",
        pointerEvents: "auto",
      }}
    >
      {/* ---- Solapa lateral siempre visible ---- */}
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Abrir feedback"
        style={{
          width: TAB_W,
          minHeight: 96,
          background: "#fff",
          border: "1px solid #e8eaf2",
          borderRight: "none",
          borderRadius: "10px 0 0 10px",
          boxShadow: "-3px 0 14px rgba(80,40,160,.10)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          flexShrink: 0,
          transition: "background .15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ff")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
      >
        <span style={{
          writingMode: "vertical-lr",
          transform: "rotate(180deg)",
          fontSize: 11,
          fontWeight: 700,
          color: "#8b5cf6",
          letterSpacing: ".06em",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#8b5cf6">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Feedback
        </span>
      </button>

      {/* ---- Panel ---- */}
      <div
        style={{
          width: PANEL_W,
          background: "#fff",
          borderRadius: "0 0 0 16px",
          boxShadow: "-6px 0 32px rgba(72,56,142,.14)",
          border: "1px solid #eef0f6",
          borderRight: "none",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 18px 10px" }}>
          <div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, color: "var(--ink)", lineHeight: 1.3 }}>
              ¿Cómo vas con Skillio?
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
              30 seg · Nos ayuda a mejorar
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Cerrar"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px 4px", lineHeight: 1, fontSize: 18, borderRadius: 6 }}
          >×</button>
        </div>

        {submitted ? (
          <div style={{ padding: "20px 18px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, color: "var(--ink)", marginBottom: 4 }}>¡Gracias por tu feedback!</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Nos ayudás a mejorar la app.</div>
          </div>
        ) : (
          <div style={{ padding: "4px 18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Estrellas */}
            <div
              style={{ display: "flex", gap: 4, justifyContent: "center" }}
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHovered(n)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 1, transition: "transform .1s" }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = "scale(.9)")}
                  onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                  aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                >
                  <StarIcon filled={(hovered || rating) >= n} />
                </button>
              ))}
            </div>

            {/* Comentario */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Contanos qué mejorarías (opcional)…"
              rows={3}
              maxLength={1000}
              style={{
                width: "100%",
                fontSize: 13,
                background: "#faf8ff",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "9px 11px",
                color: "var(--ink)",
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                boxSizing: "border-box",
                transition: "border-color .15s",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--violet)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
            />

            {/* Botón enviar */}
            <button
              onClick={handleSubmit}
              disabled={!rating || loading}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 12,
                background: "linear-gradient(135deg,#4f7dff,#8b5cf6)",
                color: "#fff",
                fontFamily: "var(--po)",
                fontWeight: 700,
                fontSize: 13.5,
                border: "none",
                cursor: rating ? "pointer" : "default",
                opacity: !rating || loading ? 0.45 : 1,
                transition: "opacity .15s",
              }}
            >
              {loading ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
