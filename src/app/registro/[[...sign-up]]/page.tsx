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
          Empezá tu <em style={{ fontStyle: "italic", color: "#9655E5" }}>ritmo.</em>
        </>
      }
      lead="Creá tu cuenta gratis y empezá a estudiar en segundos."
      footerLink={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/login"
            style={{ color: "#1f2347", textDecoration: "underline", textUnderlineOffset: 2 }}
            className="hover:text-[#9655E5] transition"
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
          variables: {
            colorPrimary: "#9655E5",
            colorText: "#1f2347",
            colorTextSecondary: "#8487a6",
            colorBackground: "transparent",
            colorInputBackground: "transparent",
            colorInputText: "#1f2347",
            borderRadius: "14px",
            fontFamily: '"Inter", -apple-system, system-ui, sans-serif',
            fontSize: "15px",
          },
          elements: {
            rootBox: { width: "100%" },
            cardBox: { width: "100%", boxShadow: "none", border: "none", background: "transparent" },
            card: { boxShadow: "none", border: "none", background: "transparent", padding: 0 },
            header: "hidden",
            footer: "hidden",
            socialButtonsBlockButton:
              "!border !border-[#eef0f6] !bg-white !text-[#1f2347] !rounded-xl !font-medium !normal-case hover:!border-[#9655E5] transition",
            socialButtonsBlockButtonText: "!text-[#1f2347]",
            dividerLine: "!bg-[#eef0f6]",
            dividerText:
              "!text-[#8487a6] !text-[10.5px] !tracking-[0.14em] !uppercase !font-semibold",
            formFieldLabel:
              "!text-[10.5px] !tracking-[0.14em] !uppercase !text-[#8487a6] !font-semibold",
            formFieldInput:
              "!bg-transparent !border-0 !border-b !border-[#eef0f6] !rounded-none !px-0 !py-2 !text-base !text-[#1f2347] focus:!border-[#9655E5] focus:!ring-0 focus:!shadow-none",
            formButtonPrimary:
              "!bg-[#9655E5] !text-white hover:!bg-[#7c3fcf] !font-semibold !rounded-full !normal-case !text-sm !shadow-none",
            formResendCodeLink: "!text-[#9655E5]",
            footerActionLink: "!text-[#9655E5]",
            alternativeMethodsBlockButton:
              "!border !border-[#eef0f6] !text-[#1f2347] !rounded-xl !normal-case hover:!border-[#9655E5]",
          },
          layout: { socialButtonsPlacement: "top" },
        }}
      />
    </AuthShell>
  );
}
