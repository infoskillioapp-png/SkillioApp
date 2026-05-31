"use client";

import { useEffect, useState } from "react";

const SHOW_DELAY = 20_000;   // 20s después de entrar
const STORAGE_KEY = "skillio_referral_nudge";
const COOLDOWN_DAYS = 2;

export function ReferralNudge({ referralUrl }: { referralUrl: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done) {
      const last = Number(done);
      if (Date.now() - last < COOLDOWN_DAYS * 24 * 60 * 60 * 1000) return;
    }
    const t = setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  function copy() {
    navigator.clipboard?.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); dismiss(); }, 1800);
    });
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[min(92vw,420px)] animate-skillio-fade-in">
      <div
        className="rounded-2xl border shadow-xl p-4 flex flex-col gap-3"
        style={{ background: "var(--paper)", borderColor: "var(--accent)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎁</span>
            <div>
              <p className="font-display font-bold text-[14px] text-ink leading-tight">
                Referí a un amigo y ganás créditos
              </p>
              <p className="text-[12px] text-ink-soft mt-0.5">
                Cada 2 referidos: <strong className="text-accent">+150 créditos</strong> para vos · <strong className="text-accent">+50</strong> para ellos
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="text-ink-softer hover:text-ink transition shrink-0 mt-0.5"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <button
          onClick={copy}
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-[12.5px] transition"
          style={{
            background: copied ? "rgba(165,64,45,0.08)" : "var(--paper-warm)",
            borderColor: copied ? "var(--accent)" : "var(--rule)",
          }}
        >
          <span className="truncate text-ink-soft">{referralUrl}</span>
          <span
            className="shrink-0 font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {copied ? "✓ Copiado" : "Copiar link"}
          </span>
        </button>
      </div>
    </div>
  );
}
