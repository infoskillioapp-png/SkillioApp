"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastKind = "success" | "error" | "info";

type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast tiene que estar dentro de <ToastProvider>");
  return c;
}

const DURATION = 4200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { ...t, id }]);
      const tm = setTimeout(() => dismiss(id), DURATION);
      timers.current.set(id, tm);
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((tm) => clearTimeout(tm));
      map.clear();
    };
  }, []);

  const api = useMemo<ToastCtx>(
    () => ({
      push,
      success: (title, description) => push({ kind: "success", title, description }),
      error: (title, description) => push({ kind: "error", title, description }),
      info: (title, description) => push({ kind: "info", title, description }),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </Ctx.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col-reverse gap-2.5 max-w-[360px] w-[calc(100vw-2.5rem)]"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const TONE: Record<ToastKind, { accent: string; bg: string; icon: React.ReactNode }> = {
  success: {
    accent: "var(--success)",
    bg: "var(--success-soft)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
        <path d="m5 12 4 4 10-10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    accent: "var(--danger)",
    bg: "var(--accent-soft)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
        <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    accent: "var(--info)",
    bg: "var(--info-soft)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8.5v.01M12 11v5.5" strokeLinecap="round" />
      </svg>
    ),
  },
};

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const tone = TONE[toast.kind];
  return (
    <div
      role="status"
      className="pointer-events-auto relative rounded-2xl bg-paper border border-rule-soft shadow-lg overflow-hidden flex items-start gap-3 pr-3 pl-3.5 py-3 animate-skillio-toast-in"
      style={{ boxShadow: `0 12px 32px rgba(53,56,49,.10), 0 2px 6px rgba(53,56,49,.04)` }}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-[1px]"
        style={{ backgroundColor: tone.bg, color: tone.accent }}
      >
        {tone.icon}
      </span>
      <div className="flex-1 min-w-0 pt-[1px]">
        <div className="font-display font-semibold text-[13.5px] leading-tight">
          {toast.title}
        </div>
        {toast.description && (
          <div className="text-[12px] text-ink-soft mt-0.5 leading-snug">
            {toast.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Cerrar"
        className="shrink-0 w-6 h-6 rounded-md text-ink-softer hover:text-ink hover:bg-paper-warm transition flex items-center justify-center"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
      {/* progress bar */}
      <span
        aria-hidden
        className="absolute left-0 bottom-0 h-[2px] animate-skillio-toast-bar"
        style={{ backgroundColor: tone.accent, opacity: 0.55 }}
      />
    </div>
  );
}
