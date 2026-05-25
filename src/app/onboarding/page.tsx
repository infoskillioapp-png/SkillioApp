import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentSkillioUser } from "@/lib/db";
import { completeOnboarding } from "@/lib/api/onboarding";

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");
  if (user.onboarding_completed) redirect("/app");

  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center px-4">
      {/* Fondo decorativo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, var(--accent-glow), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, rgba(74,107,138,0.4), transparent 65%)" }}
        />
      </div>

      <div className="relative w-full max-w-md animate-skillio-fade-in">
        {/* Logo + Booki */}
        <div className="flex items-center justify-between mb-8">
          <span className="font-display font-bold text-2xl tracking-[-0.03em]">
            Skill<span className="text-accent">io</span>
          </span>
          <Image src="/booki.png" alt="Booki" width={64} height={64} className="object-contain animate-skillio-bob" />
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-paper border border-rule-soft p-8 shadow-lg">
          <h1 className="font-display font-extrabold text-3xl tracking-[-0.03em] mb-1">
            ¡Hola! Soy <span className="text-accent italic">Booki</span> 👋
          </h1>
          <p className="text-sm text-ink-soft mb-7">
            Antes de empezar, contame un poco sobre vos para personalizar tu experiencia.
          </p>

          <form action={completeOnboarding} className="flex flex-col gap-5">
            {/* Nombre y apellido */}
            <div>
              <label className="eyebrow block mb-1.5">Nombre y apellido</label>
              <input
                name="full_name"
                type="text"
                required
                placeholder="Ej: Martín García"
                defaultValue={user.full_name ?? ""}
                className="w-full bg-transparent border-0 border-b border-rule py-2 focus:border-accent focus:outline-none text-base text-ink placeholder:text-ink-softer transition"
              />
            </div>

            {/* Edad */}
            <div>
              <label className="eyebrow block mb-1.5">Edad</label>
              <input
                name="age"
                type="number"
                required
                min={10}
                max={100}
                placeholder="Ej: 21"
                className="w-full bg-transparent border-0 border-b border-rule py-2 focus:border-accent focus:outline-none text-base text-ink placeholder:text-ink-softer transition"
              />
            </div>

            {/* Universidad / institución */}
            <div>
              <label className="eyebrow block mb-1.5">Universidad o institución</label>
              <input
                name="institution"
                type="text"
                required
                placeholder="Ej: UBA, UTN, UADE…"
                className="w-full bg-transparent border-0 border-b border-rule py-2 focus:border-accent focus:outline-none text-base text-ink placeholder:text-ink-softer transition"
              />
            </div>

            <button
              type="submit"
              className="mt-2 w-full py-3.5 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-sm hover:bg-accent-hover transition shadow-[0_8px_24px_var(--accent-glow)] active:translate-y-[1px]"
            >
              ¡Empezar a estudiar! →
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-ink-softer mt-4">
          Podés actualizar estos datos más adelante en tu perfil.
        </p>
      </div>
    </div>
  );
}
