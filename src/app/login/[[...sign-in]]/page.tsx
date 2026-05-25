import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/app/_components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      step="Acceso"
      title={
        <>
          Bienvenido <em className="italic text-accent">de nuevo.</em>
        </>
      }
      lead="Continuá tu racha. Hoy es tu día más productivo de la semana."
      footerLink={
        <>
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            className="underline underline-offset-2 text-ink hover:text-accent transition"
          >
            Registrate gratis
          </Link>
        </>
      }
    >
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/registro"
        fallbackRedirectUrl="/app"
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
            identityPreviewEditButton: "text-accent",
            formResendCodeLink: "text-accent",
          },
          layout: { socialButtonsPlacement: "bottom" },
        }}
      />
    </AuthShell>
  );
}
