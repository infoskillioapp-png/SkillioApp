import type { ReactNode } from "react";

type Props = {
  step: string;
  title: ReactNode;
  lead: ReactNode;
  children: ReactNode;
  footerLink?: ReactNode;
};

export function AuthShell({ step, title, lead, children, footerLink }: Props) {
  return (
    <div className="fixed inset-0 grid grid-cols-1 md:grid-cols-[1.05fr_1fr] bg-bg overflow-hidden">
      {/* HERO IZQUIERDO */}
      <aside className="relative hidden md:flex flex-col overflow-hidden bg-accent text-[#FBF1EF] px-14 py-10">
        {/* Anillos decorativos */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[120px] -bottom-[120px] w-[360px] h-[360px] rounded-full border border-[#FBF1EF]/25"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[220px] -bottom-[220px] w-[560px] h-[560px] rounded-full border border-[#FBF1EF]/15"
        />

        <div className="text-[11.5px] tracking-[0.15em] uppercase opacity-80">
          Skillio &nbsp;/&nbsp; La app del estudiante
        </div>


        <div className="mt-auto">
          <div className="font-display font-bold text-[88px] sm:text-[112px] leading-[0.92] tracking-[-0.04em]">
            Skill
            <br />
            io.
          </div>
          <p className="mt-6 max-w-[460px] font-display italic font-medium text-[20px] sm:text-[22px] leading-[1.3] tracking-[-0.01em]">
            &ldquo;El estudio constante no es ruido, es ritmo. Skillio te ayuda a
            encontrarlo.&rdquo;
          </p>
        </div>
      </aside>

      {/* PANEL DERECHO — FORM */}
      <main className="relative flex flex-col px-8 sm:px-14 py-8 sm:py-10 overflow-y-auto">
        <div className="flex justify-between items-center mb-auto">
          <div className="font-display font-bold text-xs tracking-[0.12em] text-ink-soft uppercase">
            {step}
          </div>
        </div>

        <div className="w-full max-w-[420px] my-auto animate-skillio-fade-in">
          <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-[-0.03em] leading-[1.05] mb-2">
            {title}
          </h1>
          <p className="text-sm text-ink-soft mb-8 max-w-[340px]">{lead}</p>

          {children}

          {footerLink && (
            <div className="mt-7 pt-5 border-t border-rule text-[12.5px] text-ink-soft">
              {footerLink}
            </div>
          )}
        </div>

        <div className="mt-auto pt-7 flex justify-between items-center text-[11.5px] text-ink-soft tracking-[0.08em]">
          <span />
          <span>© Skillio 2026</span>
        </div>
      </main>
    </div>
  );
}
