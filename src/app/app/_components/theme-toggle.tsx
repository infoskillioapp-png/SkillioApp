"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("skillio-theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("skillio-theme", next);
    } catch {
      /* storage unavailable */
    }
  }

  // Evita flash de modo equivocado en SSR
  if (!mounted) {
    return (
      <div
        className={
          compact
            ? "h-6 w-11 rounded-full bg-paper-2"
            : "h-9 w-[120px] rounded-full bg-paper-2"
        }
      />
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex items-center gap-2.5 select-none group"
      aria-label="Cambiar tema"
    >
      <span
        className="relative h-6 w-11 rounded-full border border-rule transition-colors"
        style={{ background: "var(--track)" }}
      >
        <span
          className="absolute top-[2.5px] left-[2.5px] h-[18px] w-[18px] rounded-full bg-[var(--thumb)] flex items-center justify-center text-[10px] leading-none shadow-sm transition-transform duration-300"
          style={{
            transform: theme === "dark" ? "translateX(20px)" : "translateX(0)",
          }}
        >
          {theme === "dark" ? "🌙" : "☀"}
        </span>
      </span>
      {!compact && (
        <span className="hidden sm:inline text-[11.5px] text-ink-soft">
          Modo {theme === "dark" ? "oscuro" : "claro"}
        </span>
      )}
    </button>
  );
}
