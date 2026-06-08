import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/app/_components/auth-shell";

interface Props {
  searchParams: Promise<{ plan?: string; ref?: string }>;
}

export default async function RegistroPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ref = sp.ref ? `?ref=${sp.ref}` : "";

  return (
    <AuthShell
      step="Registro"
      title={
        <>
          Empezá tu <em className="italic text-accent">ritmo.</em>
        </>
      }
      lead="Creá tu cuenta gratis y empezá a estudiar en segundos."
      footerLink={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            className="underline underline-offset-2 text-ink hover:text-accent transition"
          >
            Iniciá sesión
          </Link>
        </>
      }
    >
      <SignUp
        routing="path"
        path="/registro"
        signInUrl="/login"
        forceRedirectUrl={`/onboarding${ref}`}
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none border-none",
            card: "shadow-none bg-transparent border-none p-0",
            header: "hidden",
            footer: "hidden",
            socialButtonsBlockButton:
              "border border-rule bg-paper-warm text-ink rounded-full hover:border-ink-soft transition normal-case font-medium",
            socialButtonsBlockButtonText: "text-ink",
            dividerLine: "bg-rule",
            dividerText:
              "text-ink-soft text-[10.5px] tracking-[0.14em] uppercase font-semibold",
            formFieldLabel:
              "text-[10.5px] tracking-[0.14em] uppercase text-ink-soft font-semibold",
            formFieldInput:
              "bg-transparent border-0 border-b border-rule rounded-none px-0 py-2 focus:border-accent focus:ring-0 text-base text-ink",
            formButtonPrimary:
              "bg-ink text-bg hover:bg-accent hover:text-bg font-display font-semibold rounded-full normal-case text-sm shadow-none",
            formResendCodeLink: "text-accent",
          },
          layout: { socialButtonsPlacement: "bottom" },
        }}
      />
    </AuthShell>
  );
}
