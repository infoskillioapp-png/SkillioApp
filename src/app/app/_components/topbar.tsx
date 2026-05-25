"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { ThemeToggle } from "./theme-toggle";
import type { SkillioUser } from "@/lib/sync-user";

function MobileUserMenu({ user }: { user: SkillioUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState<"idle" | "confirm" | "loading" | "done">("idle");

  const initials =
    user.full_name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? user.email.slice(0, 2).toUpperCase();

  async function handleCancel() {
    if (cancelStep === "idle") { setCancelStep("confirm"); return; }
    if (cancelStep === "confirm") {
      setCancelStep("loading");
      try {
        await fetch("/api/subscription/cancel", { method: "POST" });
        setCancelStep("done");
        router.refresh();
      } catch {
        setCancelStep("idle");
      }
    }
  }

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] font-display text-[12px] font-bold text-[#FBF1EF]"
        aria-label="Perfil"
      >
        {initials}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 w-56 rounded-2xl border border-rule bg-paper shadow-lg overflow-hidden">
            <div className="px-3.5 py-3 border-b border-rule">
              <p className="text-[12.5px] font-semibold truncate">
                {user.full_name ?? user.email.split("@")[0]}
              </p>
              <p className="text-[11px] text-ink-softer truncate">{user.email}</p>
              <p className="text-[10.5px] text-ink-soft mt-0.5">
                {user.plan === "pro" ? "Pro" : "Básico"} · 🔥 {user.current_streak}d
              </p>
            </div>
            <div className="px-3.5 py-2.5 space-y-0.5 border-b border-rule">
              {cancelStep === "done" ? (
                <p className="text-[11.5px] text-green-500 py-1">Suscripción cancelada.</p>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={cancelStep === "loading"}
                  className="flex w-full items-center gap-2 text-[12px] text-red-400 hover:text-red-500 transition py-1 disabled:opacity-50"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-3.5 h-3.5 shrink-0">
                    <path d="M3 6h18M9 6V4h6v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {cancelStep === "loading"
                    ? "Cancelando..."
                    : cancelStep === "confirm"
                      ? "¿Confirmar cancelación?"
                      : "Cancelar suscripción"}
                </button>
              )}
              {cancelStep === "confirm" && (
                <button
                  type="button"
                  onClick={() => setCancelStep("idle")}
                  className="text-[11px] text-ink-softer hover:text-ink transition pl-5"
                >
                  No, mantener
                </button>
              )}
            </div>
            <div className="px-3.5 py-2.5">
              <SignOutButton>
                <button className="flex w-full items-center gap-2 text-[12.5px] text-ink-soft hover:text-ink transition py-1">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-4 h-4 shrink-0">
                    <path d="M15 4h4v16h-4M3 12h12m-3-4 4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Cerrar sesión
                </button>
              </SignOutButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Topbar({ user }: { user?: SkillioUser }) {
  return (
    <header className="flex items-center justify-between px-5 sm:px-6 bg-bg border-b border-rule transition-colors">
      <div className="font-display font-bold text-[11.5px] tracking-[0.18em] uppercase text-ink-soft">
        Skillio <span className="text-ink-softer">· v3.0</span>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && <MobileUserMenu user={user} />}
      </div>
    </header>
  );
}
