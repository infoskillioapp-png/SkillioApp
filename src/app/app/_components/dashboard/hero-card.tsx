"use client";

import Link from "next/link";
import type { AiOutputRow } from "@/lib/api/ai-outputs";
import type { Subject } from "@/lib/types";

// Hero card principal — estilo prototipo 3.0 (gradiente violeta)
export function DashboardHero({ firstName }: { firstName: string }) {
  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-7 sm:p-8 min-h-[220px] flex items-center"
      style={{
        background: "linear-gradient(125deg,#6d3bf2 0%,#9326cf 52%,#c1338f 100%)",
        boxShadow: "0 22px 46px rgba(124,58,242,.34)",
        color: "#fff",
      }}
    >
      {/* blobs de profundidad */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 300, height: 300, top: -90, right: 90,
          background: "radial-gradient(circle,rgba(255,255,255,.18),transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-full"
        style={{
          width: 140, height: 140, bottom: -50, left: 40,
          background: "radial-gradient(circle,rgba(255,255,255,.1),transparent 65%)",
        }}
      />
      {/* gloss superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,0) 40%)" }}
      />

      <div className="relative z-10 max-w-[400px]">
        <div className="text-[11px] font-bold tracking-[.14em] uppercase opacity-80 mb-3">
          Hola, {firstName} 👋
        </div>
        <h1 className="font-display font-extrabold text-[28px] sm:text-[34px] leading-[1.1] mb-3">
          Subí tu apunte y<br />aprobá más fácil.
        </h1>
        <p className="text-[13px] opacity-90 leading-snug mb-6">
          Booki arma el resumen, las tarjetas y el simulacro. Vos solo concentrarte en aprender.
        </p>
        <Link
          href="/app/ia"
          className="inline-flex items-center gap-2.5 font-display font-bold text-[14px] px-6 py-3.5 rounded-2xl transition hover:-translate-y-[3px] active:scale-[.97]"
          style={{
            background: "#fff",
            color: "#6d28d9",
            boxShadow: "0 12px 24px rgba(0,0,0,.18)",
          }}
        >
          <span
            className="w-7 h-7 rounded-[10px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6d3bf2,#c1338f)" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          </span>
          Subir apunte
        </Link>
      </div>

      {/* Booki illustration — solo desktop */}
      <div
        aria-hidden
        className="hidden lg:block absolute right-0 top-0 bottom-0 w-[260px] pointer-events-none"
        style={{
          backgroundImage: "url(/booki-3.png)",
          backgroundSize: "contain",
          backgroundPosition: "center bottom",
          backgroundRepeat: "no-repeat",
          WebkitMaskImage: "radial-gradient(72% 90% at 60% 40%, #000 50%, transparent 78%)",
          maskImage: "radial-gradient(72% 90% at 60% 40%, #000 50%, transparent 78%)",
        }}
      />
    </section>
  );
}

// Card "Continuar donde quedaste" — azul (similar al prototipo)
export function DashboardContinuar({ lastOutput }: { lastOutput: AiOutputRow | null }) {
  const KIND_LABEL: Record<string, string> = {
    summary: "Resumen",
    flashcards: "Flashcards",
    simulacro: "Simulacro",
  };
  const KIND_ICON: Record<string, string> = {
    summary: "📄",
    flashcards: "🃏",
    simulacro: "📝",
  };

  if (!lastOutput) {
    return (
      <div
        className="rounded-[24px] p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden"
        style={{
          background: "linear-gradient(155deg,#5b8cff 0%,#3f63ff 100%)",
          boxShadow: "0 12px 32px rgba(63,99,255,.35)",
          color: "#fff",
        }}
      >
        <div aria-hidden className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, top: -60, right: -30, background: "rgba(255,255,255,.13)" }} />
        <div className="relative z-10">
          <div className="text-[10.5px] font-bold tracking-[.1em] uppercase opacity-80 mb-2 flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            Continuá donde quedaste
          </div>
          <div className="font-display font-bold text-[18px] leading-tight mb-2 opacity-90">
            Todavía no generaste nada
          </div>
          <div className="text-[12px] opacity-75">Subí tu primer apunte y empezá.</div>
        </div>
        <Link
          href="/app/ia"
          className="relative z-10 mt-4 flex items-center justify-center gap-2 font-display font-bold text-[13.5px] py-3 rounded-2xl transition hover:opacity-90"
          style={{ background: "#fff", color: "#3f63ff", boxShadow: "0 8px 20px rgba(0,0,0,.15)" }}
        >
          Ir al Espacio de Estudio
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Link>
      </div>
    );
  }

  return (
    <div
      className="rounded-[24px] p-5 flex flex-col justify-between min-h-[160px] relative overflow-hidden cursor-pointer"
      style={{
        background: "linear-gradient(155deg,#5b8cff 0%,#3f63ff 100%)",
        boxShadow: "0 12px 32px rgba(63,99,255,.35)",
        color: "#fff",
      }}
    >
      <div aria-hidden className="absolute rounded-full pointer-events-none" style={{ width: 180, height: 180, top: -60, right: -30, background: "rgba(255,255,255,.13)" }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 46%)" }} />

      <div className="relative z-10">
        <div className="text-[10.5px] font-bold tracking-[.1em] uppercase opacity-80 mb-3 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          Continuá donde quedaste
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{KIND_ICON[lastOutput.kind] ?? "📄"}</span>
          <div>
            <div className="font-display font-bold text-[15px] leading-tight truncate max-w-[200px]">
              {lastOutput.title ?? "(sin título)"}
            </div>
            <div className="text-[11.5px] opacity-75 mt-0.5">
              {KIND_LABEL[lastOutput.kind]} · {new Date(lastOutput.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/app/ia"
        className="relative z-10 flex items-center justify-center gap-2 font-display font-bold text-[13.5px] py-3 rounded-2xl transition hover:opacity-90 active:scale-[.97]"
        style={{ background: "#fff", color: "#3f63ff", boxShadow: "0 8px 20px rgba(0,0,0,.15)" }}
      >
        Retomar estudio
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </Link>
    </div>
  );
}

// Acordeón de materias — estilo prototipo
const SUBJECT_COLORS = [
  ["#5b8cff", "#3f63ff"],
  ["#9a63f7", "#7c3aed"],
  ["#ff6b81", "#e4264f"],
  ["#34d399", "#10b981"],
  ["#fbbf24", "#f59e0b"],
];

export function DashboardMaterias({ subjects }: { subjects: Subject[] }) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display font-extrabold text-[22px] tracking-[-0.02em]">Mis materias</h2>
          <p className="text-[13px] text-ink-soft mt-0.5">Tus apuntes ordenados por materia.</p>
        </div>
        <Link href="/app/materias" className="text-[13px] font-bold text-accent hover:underline transition">
          Ver todas →
        </Link>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-rule p-10 text-center">
          <div className="text-4xl mb-3">📚</div>
          <p className="font-display font-bold text-base mb-1">Todavía no tenés materias</p>
          <p className="text-[13px] text-ink-soft mb-5">Creá la primera y organizá todos tus apuntes.</p>
          <Link href="/app/materias" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold text-[#FBF1EF]" style={{ background: "linear-gradient(135deg,#5b8cff,#7c3aed)" }}>
            Crear materia
          </Link>
        </div>
      ) : (
        <div className="rounded-[24px] bg-paper border border-rule-soft overflow-hidden divide-y divide-rule-soft">
          {subjects.map((s, i) => {
            const [c1, c2] = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
            return (
              <Link
                key={s.id}
                href="/app/materias"
                className="flex items-center gap-4 px-5 py-4 hover:bg-paper-warm transition group"
              >
                <span
                  className="w-11 h-11 rounded-[14px] flex-none flex items-center justify-center font-display font-bold text-white text-[15px]"
                  style={{ background: `linear-gradient(135deg,${c1},${c2})`, boxShadow: `0 6px 14px ${c1}40` }}
                >
                  {s.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[14.5px] truncate">{s.name}</div>
                  {s.professor && <div className="text-[11.5px] text-ink-soft truncate">{s.professor}</div>}
                </div>
                <svg
                  className="w-4 h-4 text-ink-softer group-hover:text-ink-soft transition shrink-0"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
