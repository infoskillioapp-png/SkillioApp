import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { SkillioMark } from "@/app/_components/landing/landing-top";

interface Props {
  searchParams: Promise<{ reason?: string }>;
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  disposable: {
    title: "Necesitás un email real",
    body: "Detectamos que usaste un correo temporal o descartable. Para crear tu cuenta en Skillio, registrate con un email de verdad (Gmail, Outlook, el de tu facultad…).",
  },
  duplicate: {
    title: "Ese email ya tiene una cuenta",
    body: "Este correo (o una variante con puntos o +alias) ya está registrado en Skillio. Iniciá sesión con esa cuenta o usá un email distinto.",
  },
};

export default async function BloqueadoPage({ searchParams }: Props) {
  const { reason } = await searchParams;
  const msg = MESSAGES[reason ?? ""] ?? {
    title: "No pudimos crear tu cuenta",
    body: "Hubo un problema al validar tu registro. Probá con otro email.",
  };

  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
      </div>

      <div className="relative w-full max-w-md animate-skillio-fade-in text-center">
        <div className="flex justify-center mb-8">
          <SkillioMark size={28} />
        </div>

        <div className="rounded-3xl bg-paper border border-rule-soft p-8 shadow-lg">
          <div className="text-5xl mb-4">🛑</div>
          <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em] mb-3">
            {msg.title}
          </h1>
          <p className="text-sm text-ink-soft mb-7 leading-relaxed">{msg.body}</p>

          <SignOutButton redirectUrl="/registro">
            <button
              type="button"
              className="w-full py-3.5 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-sm hover:bg-accent-hover transition shadow-[0_8px_24px_var(--accent-glow)] active:translate-y-[1px]"
            >
              Cerrar sesión y usar otro email →
            </button>
          </SignOutButton>

          <Link
            href="/login"
            className="block mt-4 text-[12px] text-ink-softer hover:text-ink-soft transition"
          >
            Ya tengo cuenta · Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
