import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/app/_components/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell
      step="Acceso"
      title={
        <>
          Bienvenido <em style={{ fontStyle: "italic", color: "#9655E5" }}>de nuevo.</em>
        </>
      }
      lead="Continuá tu racha. Hoy es tu día más productivo de la semana."
      footerLink={
        <>
          ¿No tenés cuenta?{" "}
          <Link
            href="/registro"
            style={{ color: "#1f2347", textDecoration: "underline", textUnderlineOffset: 2 }}
            className="hover:text-[#9655E5] transition"
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
            identityPreviewEditButton: "!text-[#9655E5]",
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
