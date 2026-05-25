"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  redirectTo: string;
  delayMs?: number;
};

export function LoadingScreen({ redirectTo, delayMs = 2000 }: Props) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(redirectTo);
    const id = setTimeout(() => router.push(redirectTo), delayMs);
    return () => clearTimeout(id);
  }, [router, redirectTo, delayMs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg transition-colors">
      <div className="w-full max-w-[480px] px-8 text-center">
        <h1 className="font-display font-bold leading-[0.9] tracking-[-0.04em] text-ink text-[88px] sm:text-[96px]">
          Skill<span className="text-accent italic">io</span>
          <span
            aria-hidden
            className="inline-block w-3 h-3 rounded-full bg-accent align-super ml-2 animate-skillio-blink"
          />
        </h1>

        <div className="eyebrow mt-6">Tu diario de estudio · 2026</div>

        <div className="mt-7 mb-4 h-[2px] w-full overflow-hidden rounded-full bg-rule">
          <div className="h-full bg-accent animate-skillio-loadbar" />
        </div>

        <div className="flex justify-between text-[11.5px] uppercase tracking-[0.08em] text-ink-soft">
          <span>Cargando sesión</span>
          <span>v 3.0</span>
        </div>
      </div>
    </div>
  );
}
