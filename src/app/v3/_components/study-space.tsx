"use client";

import { useState } from "react";

// ===========================================================================
// Íconos (SVG estilo Lucide — nunca emojis como íconos)
// ===========================================================================
type IconProps = { className?: string };
const Plus = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={p.className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const FileText = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" /><path d="M9 9h1M9 13h6M9 17h6" />
  </svg>
);
const Share = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
  </svg>
);
const BookOpen = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M12 7v14M3 18V5a1 1 0 0 1 1-1h5a3 3 0 0 1 3 3 3 3 0 0 1 3-3h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a2 2 0 0 0-2 2 2 2 0 0 0-2-2H4a1 1 0 0 1-1-1Z" />
  </svg>
);
const Layers = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
  </svg>
);
const Target = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" />
  </svg>
);
const Chevron = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const Sparkle = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);
const ArrowRight = (p: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={p.className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// ===========================================================================
// Data mock (en producción viene del apunte + generación de IA)
// ===========================================================================
const APUNTE = {
  materia: "Anatomía",
  titulo: "Sistema cardiovascular",
  dominio: 38,
  modos: {
    resumen: { status: "en_progreso" as const, hint: "Empezá por El corazón, el primer tema." },
    flashcards: { status: "en_progreso" as const, count: 51, mastered: 12 },
    simulacro: { status: "no_empezado" as const, count: 53 },
  },
  secciones: [
    {
      n: 1,
      nombre: "El corazón",
      temas: [
        { nombre: "Anatomía del corazón", dominio: 100 },
        { nombre: "Ciclo cardíaco", dominio: 60 },
        { nombre: "Sistema de conducción", dominio: 25 },
        { nombre: "Gasto cardíaco", dominio: 0 },
      ],
    },
    {
      n: 2,
      nombre: "Circulación",
      temas: [
        { nombre: "Arterias y venas", dominio: 40 },
        { nombre: "Presión arterial", dominio: 0 },
        { nombre: "Circulación pulmonar", dominio: 0 },
      ],
    },
  ],
};

type Status = "no_empezado" | "en_progreso" | "dominado";

// ===========================================================================
// Pantalla
// ===========================================================================
export default function StudySpace() {
  const [open, setOpen] = useState<Record<number, boolean>>({ 1: true, 2: true });

  return (
    <div className="flex min-h-screen bg-white">
      {/* RAIL izquierdo (desktop) */}
      <aside className="hidden md:flex w-[68px] shrink-0 flex-col items-center gap-5 border-r border-[#eceae6] py-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 font-bold text-white v3-display">S</div>
        <button
          type="button"
          className="grid h-11 w-11 cursor-pointer place-items-center rounded-2xl bg-orange-500 text-white shadow-[0_8px_18px_rgba(249,115,22,0.3)] transition hover:bg-orange-600 active:scale-95"
          aria-label="Nuevo apunte"
        >
          <Plus className="h-5 w-5" />
        </button>
        <div className="mt-auto flex flex-col items-center gap-3">
          <div className="h-[22px] w-[22px] rounded-md border border-dashed border-neutral-300" />
          <div className="h-[22px] w-[22px] rounded-md border border-dashed border-neutral-300" />
          <div className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-[13px] font-semibold text-white">E</div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="min-w-0 flex-1 overflow-x-hidden">
        {/* top bar mobile */}
        <div className="flex items-center gap-3 border-b border-[#eceae6] px-4 py-3 md:hidden">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500 text-[13px] font-bold text-white v3-display">S</div>
          <span className="v3-display text-[15px] font-semibold">Skillio</span>
          <button type="button" aria-label="Nuevo apunte" className="ml-auto grid h-9 w-9 place-items-center rounded-xl bg-orange-500 text-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-10">
          {/* breadcrumb */}
          <nav className="mb-2 flex items-center gap-1.5 text-[12.5px] text-[#9a958c]">
            <span className="cursor-pointer transition hover:text-[#6b665e]">Mis apuntes</span>
            <Chevron className="h-3.5 w-3.5" />
            <span className="font-medium text-[#6b665e]">{APUNTE.materia}</span>
          </nav>

          {/* header */}
          <header className="mb-9 flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <h1 className="v3-display text-[30px] font-bold leading-tight text-[#1b1a17] sm:text-[34px]">
                {APUNTE.titulo}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-[13px] font-medium text-[#6b665e]">
                <button type="button" className="flex cursor-pointer items-center gap-1.5 transition hover:text-orange-600">
                  <FileText className="h-4 w-4" /> Ver archivo
                </button>
                <button type="button" className="flex cursor-pointer items-center gap-1.5 transition hover:text-orange-600">
                  <Share className="h-4 w-4" /> Compartir
                </button>
              </div>
            </div>
            <DominioRing value={APUNTE.dominio} />
          </header>

          {/* Estudiá a tu manera */}
          <SectionLabel>Estudiá a tu manera</SectionLabel>
          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ModeCard
              icon={<BookOpen className="h-5 w-5" />}
              title="Resumen"
              desc={APUNTE.modos.resumen.hint}
              status={APUNTE.modos.resumen.status}
              cta="Leer resumen"
            />
            <ModeCard
              icon={<Layers className="h-5 w-5" />}
              title="Tarjetas de estudio"
              desc={`Memorizá ${APUNTE.modos.flashcards.count} términos con repetición espaciada.`}
              status={APUNTE.modos.flashcards.status}
              cta="Continuar"
            />
            <ModeCard
              icon={<Target className="h-5 w-5" />}
              title="Simulacro"
              desc={`Resolvé ${APUNTE.modos.simulacro.count} preguntas y detectá tus lagunas.`}
              status={APUNTE.modos.simulacro.status}
              cta="Comenzar"
            />
          </div>

          {/* Desglose del tema */}
          <SectionLabel>Desglose del tema</SectionLabel>
          <div className="space-y-3">
            {APUNTE.secciones.map((sec) => {
              const isOpen = open[sec.n] ?? true;
              const avg = Math.round(sec.temas.reduce((s, t) => s + t.dominio, 0) / sec.temas.length);
              return (
                <div key={sec.n} className="v3-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [sec.n]: !isOpen }))}
                    className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition hover:bg-[#fafaf9]"
                  >
                    <Chevron className={`h-4 w-4 text-[#9a958c] transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <span className="v3-display text-[15px] font-semibold">
                      Sección {sec.n} · {sec.nombre}
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      <span className="hidden text-[12px] font-medium text-[#9a958c] sm:inline">{sec.temas.length} temas</span>
                      <span className="text-[12.5px] font-semibold tabular-nums text-[#6b665e]">{avg}%</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#f1efeb]">
                      {sec.temas.map((t, i) => (
                        <TemaRow key={i} nombre={t.nombre} dominio={t.dominio} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Booki flotante */}
      <button
        type="button"
        className="fixed bottom-5 right-5 z-30 flex cursor-pointer items-center gap-2 rounded-full border border-[#eceae6] bg-white py-2.5 pl-3 pr-4 text-[13.5px] font-semibold text-[#1b1a17] shadow-[0_8px_24px_rgba(27,26,23,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(27,26,23,0.16)]"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-orange-500 text-white">
          <Sparkle className="h-4 w-4" />
        </span>
        Preguntale a Booki
      </button>
    </div>
  );
}

// ===========================================================================
// Subcomponentes
// ===========================================================================
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="v3-display mb-4 text-[16px] font-semibold text-[#1b1a17]">{children}</h2>;
}

function DominioRing({ value }: { value: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={r} fill="none" stroke="#f1efeb" strokeWidth="7" />
          <circle
            cx="38" cy="38" r={r} fill="none" stroke="#f97316" strokeWidth="7" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.22,1,.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="v3-display text-[18px] font-bold tabular-nums text-[#1b1a17]">{value}%</span>
        </div>
      </div>
      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a958c]">Dominio</span>
    </div>
  );
}

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  no_empezado: { label: "No empezado", cls: "bg-neutral-100 text-neutral-500" },
  en_progreso: { label: "En progreso", cls: "bg-orange-50 text-orange-600" },
  dominado: { label: "Dominado", cls: "bg-green-50 text-green-600" },
};

function ModeCard({
  icon, title, desc, status, cta,
}: {
  icon: React.ReactNode; title: string; desc: string; status: Status; cta: string;
}) {
  const st = STATUS_META[status];
  return (
    <div className="v3-card v3-card-hover group flex cursor-pointer flex-col p-5">
      <div className="mb-4 flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-500">{icon}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${st.cls}`}>{st.label}</span>
      </div>
      <h3 className="v3-display text-[17px] font-semibold text-[#1b1a17]">{title}</h3>
      <p className="mt-1.5 mb-5 min-h-[40px] text-[13px] leading-relaxed text-[#6b665e]">{desc}</p>
      <div className="mt-auto flex items-center justify-between rounded-xl bg-orange-500 px-4 py-2.5 text-[13.5px] font-semibold text-white transition group-hover:bg-orange-600">
        {cta}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}

function TemaRow({ nombre, dominio }: { nombre: string; dominio: number }) {
  const done = dominio >= 100;
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-[#fafaf9] [&:not(:last-child)]:border-b [&:not(:last-child)]:border-[#f1efeb]">
      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${done ? "border-green-600 bg-green-600 text-white" : "border-neutral-300"}`}>
        {done && (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3 w-3">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[#1b1a17]">{nombre}</span>
      <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-[#f1efeb] sm:block">
        <div
          className="h-full rounded-full"
          style={{ width: `${dominio}%`, background: done ? "#16a34a" : "#f97316", transition: "width .7s ease" }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-[#9a958c]">{dominio}%</span>
      <Chevron className="h-4 w-4 shrink-0 text-[#cfcabf]" />
    </div>
  );
}
