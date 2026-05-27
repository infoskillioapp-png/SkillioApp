"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SHOW_DELAY = 60_000;   // 60s para mostrar
const AUTO_CLOSE = 30_000;   // 30s para cerrar si no interactuó
const STORAGE_KEY = "skillio_feedback_done";
const COOLDOWN_DAYS = 30;

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function FeedbackWidget() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const interacted = useRef(false);

  useEffect(() => {
    // No mostrar si ya lo completó recientemente
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) {
      const last = Number(done);
      if (Date.now() - last < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return;
    }

    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => clearTimeout(showTimer);
  }, []);

  // Iniciar auto-close cuando aparece
  useEffect(() => {
    if (!visible || submitted) return;

    setCountdown(30);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    autoCloseRef.current = setTimeout(() => {
      if (!interacted.current) dismiss();
    }, AUTO_CLOSE);

    return () => {
      clearTimeout(autoCloseRef.current!);
      clearInterval(countdownRef.current!);
    };
  }, [visible, submitted]);

  function onInteract() {
    interacted.current = true;
    clearTimeout(autoCloseRef.current!);
    clearInterval(countdownRef.current!);
    setCountdown(0);
  }

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
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
      setTimeout(() => setVisible(false), 2500);
    } finally {
      setLoading(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      {/* Overlay solo en mobile para cerrar tocando afuera */}
      <div
        className="fixed inset-0 z-40 md:hidden"
        onClick={dismiss}
        aria-hidden
      />

      <div
        role="dialog"
        aria-label="Calificá la app"
        className="fixed z-50 bottom-4 right-4 left-4 md:left-auto md:w-[340px] rounded-2xl shadow-2xl border border-rule-soft animate-skillio-fade-in"
        style={{ background: "var(--paper)" }}
        onMouseEnter={onInteract}
        onTouchStart={onInteract}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-0">
          <div>
            <p className="font-display font-bold text-base text-ink leading-tight">
              ¿Cómo vas con Skillio?
            </p>
            <p className="text-xs text-ink-soft mt-0.5">
              30 segundos · Nos ayuda un montón
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-ink-softer hover:text-ink transition ml-3 mt-0.5 flex-shrink-0"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-6 text-center">
            <div className="text-3xl mb-2">🎉</div>
            <p className="font-display font-bold text-base text-ink">¡Gracias por tu feedback!</p>
            <p className="text-xs text-ink-soft mt-1">Nos ayudás a mejorar la app.</p>
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-3">
            {/* Estrellas */}
            <div
              className="flex gap-1 justify-center"
              onMouseLeave={() => setHovered(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => { onInteract(); setRating(n); }}
                  onMouseEnter={() => { onInteract(); setHovered(n); }}
                  className="transition-transform hover:scale-110 active:scale-95"
                  style={{ color: (hovered || rating) >= n ? "#F4C969" : "var(--rule)" }}
                  aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                >
                  <StarIcon filled={(hovered || rating) >= n} />
                </button>
              ))}
            </div>

            {/* Comentario */}
            <textarea
              value={comment}
              onChange={(e) => { onInteract(); setComment(e.target.value); }}
              placeholder="Contanos qué mejorarías (opcional)…"
              rows={2}
              maxLength={1000}
              className="w-full text-sm bg-transparent border border-rule rounded-xl px-3 py-2 text-ink placeholder:text-ink-softer resize-none focus:outline-none focus:border-accent transition"
            />

            {/* Footer */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={!rating || loading}
                className="flex-1 py-2.5 rounded-full font-display font-bold text-sm transition disabled:opacity-40"
                style={{ background: "var(--accent)", color: "#FBF1EF" }}
              >
                {loading ? "Enviando…" : "Enviar"}
              </button>
              {countdown > 0 && (
                <span className="text-xs text-ink-softer tabular-nums w-8 text-right">
                  {countdown}s
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
