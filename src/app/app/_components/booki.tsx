"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Reminder = {
  id: string;
  when: string;
  date: string;
  time: string;
  title: string;
  place: string;
  tone: "danger" | "info" | "warning";
};

type Props = { firstName: string; reminders: Reminder[] };

export function Booki({ firstName, reminders }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startData = useRef({ px: 0, py: 0, ex: 0, ey: 0 });

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  function avatarSize() {
    return window.innerWidth < 640 ? 80 : 96;
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const AV = avatarSize();
    const W = window.innerWidth;
    const H = window.innerHeight;
    // Use stored pos — getBoundingClientRect includes bubble when open, giving wrong origin
    const ex = pos ? pos.x : W - AV - 16;
    const ey = pos ? pos.y : H - AV - 72;
    startData.current = { px: e.clientX, py: e.clientY, ex, ey };
    isDragging.current = true;
    hasMoved.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isDragging.current) return;
    const dx = e.clientX - startData.current.px;
    const dy = e.clientY - startData.current.py;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) hasMoved.current = true;
    if (!hasMoved.current) return;
    const AV = avatarSize();
    const W = window.innerWidth;
    const H = window.innerHeight;
    setPos({
      x: Math.max(4, Math.min(W - AV - 4, startData.current.ex + dx)),
      y: Math.max(4, Math.min(H - AV - 4, startData.current.ey + dy)),
    });
  }

  function onPointerUp() {
    if (!hasMoved.current) setOpen((o) => !o);
    isDragging.current = false;
    hasMoved.current = false;
  }

  // Anchor bubble to the side that has more space so it never overflows
  const isRightHalf = pos ? pos.x > window.innerWidth / 2 : true;

  return (
    <div
      ref={containerRef}
      className="fixed z-50 pointer-events-none"
      style={
        pos
          ? { left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
          : { bottom: "calc(env(safe-area-inset-bottom) + 72px)", right: "16px" }
      }
    >
      {/* Bubble — absolute, always above avatar, anchored to avoid overflow */}
      {open && reminders.length > 0 && (
        <div
          className="pointer-events-auto absolute bottom-full mb-2 rounded-3xl bg-[#1c1c1a] border border-white/10 shadow-2xl p-4 sm:p-5 animate-skillio-fade-in"
          style={{
            width: "min(310px, calc(100vw - 32px))",
            transformOrigin: isRightHalf ? "bottom right" : "bottom left",
            ...(isRightHalf ? { right: 0 } : { left: 0 }),
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="font-display font-bold text-[15px] text-white">
                ¡Hola, {firstName}! <span className="inline-block animate-pulse">👋</span>
              </div>
              <p className="text-[12px] text-white/60 mt-0.5">
                Tenés{" "}
                <strong className="text-white">
                  {reminders.length} {reminders.length === 1 ? "evento" : "eventos"}
                </strong>{" "}
                importantes próximos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white transition shrink-0 pointer-events-auto"
              aria-label="Cerrar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="space-y-2 mb-3">
            {reminders.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border p-2.5 ${
                  r.tone === "danger"
                    ? "border-red-500/30 bg-red-500/10"
                    : r.tone === "warning"
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-blue-400/30 bg-blue-400/10"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] font-semibold mb-0.5">
                  <span className={
                    r.tone === "danger" ? "text-red-400"
                    : r.tone === "warning" ? "text-amber-400"
                    : "text-blue-400"
                  }>
                    {r.when}
                  </span>
                  <span className="text-white/50">{r.date} · {r.time}</span>
                </div>
                <div className="font-semibold text-[12.5px] text-white">
                  {r.tone === "danger" && "⚠ "}{r.title}
                </div>
                {r.place && <div className="text-[11px] text-white/50">{r.place}</div>}
              </div>
            ))}
          </div>

          <Link
            href="/app/agenda"
            onClick={() => setOpen(false)}
            className="block text-center w-full py-2.5 rounded-full font-display font-bold text-[12.5px] transition pointer-events-auto"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
              color: "#FBF1EF",
              boxShadow: "0 4px 16px var(--accent-glow)",
            }}
          >
            Ver agenda completa →
          </Link>
        </div>
      )}

      {/* Avatar — drag handle */}
      <button
        type="button"
        className="pointer-events-auto relative shrink-0 group touch-none select-none cursor-grab active:cursor-grabbing"
        aria-label="Hablar con Booki"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-full blur-2xl scale-90 opacity-60 animate-pulse"
          style={{ background: "var(--accent-glow)" }}
        />
        <span className="relative block w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] drop-shadow-[0_8px_24px_rgba(165,64,45,0.3)] transition-transform group-hover:-translate-y-1">
          <Image
            src="/booki.png"
            alt="Booki"
            width={96}
            height={96}
            className="object-contain animate-skillio-bob w-full h-full"
            priority
          />
        </span>
      </button>
    </div>
  );
}
