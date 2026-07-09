"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { SkillioMark } from "@/app/_components/landing/landing-top";

function fireStartTrial(plan: string, preapproval: string | null) {
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq) return;
  const value = plan === "semanal" ? 4900 : plan === "trimestral" ? 34900 : 15900;
  fbq(
    "track",
    "StartTrial",
    { value, currency: "ARS", content_name: `Plan ${plan.toUpperCase()} Skillio` },
    preapproval ? { eventID: `starttrial_${preapproval}` } : undefined,
  );
}

// Flujo de pago del embudo anónimo (registro diferido). El usuario vuelve de MP
// deslogueado: confirma su mail (prefill con el de MP) → se crea la cuenta y se
// reclama la sesión anónima → auto-login con sign-in token → /app.
export function AnonClaimClient({
  preapprovalId,
  defaultEmail,
}: {
  preapprovalId: string | null;
  defaultEmail: string;
}) {
  const router = useRouter();
  // Clerk "future" API: useSignIn() devuelve una señal con signIn (SignInFuture).
  const { signIn } = useSignIn();
  const [email, setEmail] = useState(defaultEmail);
  const [phase, setPhase] = useState<"confirm" | "working" | "error">("confirm");
  const [errMsg, setErrMsg] = useState("");

  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrMsg("Revisá que el mail esté bien escrito.");
      setPhase("error");
      return;
    }
    if (!signIn) {
      setErrMsg("Un segundo, todavía cargando… probá de nuevo.");
      setPhase("error");
      return;
    }

    setPhase("working");
    setErrMsg("");
    try {
      const res = await fetch("/api/public/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preapproval_id: preapprovalId, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        setErrMsg("No pudimos crear tu cuenta. Probá de nuevo o escribinos a soporte.");
        setPhase("error");
        return;
      }

      fireStartTrial(data.plan ?? "pro", preapprovalId);

      // Auto-login con el sign-in token (ticket) — Clerk future API.
      const ticketRes = await signIn.ticket({ ticket: data.token });
      if (ticketRes.error) {
        // Cuenta creada pero el auto-login no completó: la mandamos a entrar.
        router.replace("/login");
        return;
      }
      const finRes = await signIn.finalize({
        navigate: () => router.replace("/app?upgraded=1"),
      });
      if (finRes.error) router.replace("/app?upgraded=1");
    } catch {
      setErrMsg("Algo salió mal. Tu pago está registrado — probá de nuevo.");
      setPhase("error");
    }
  }

  const working = phase === "working";

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px 64px",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(139,92,246,.16), transparent 60%), var(--bg)",
        textAlign: "center",
      }}
    >
      <div style={{ width: "min(440px, 100%)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SkillioMark size={30} />
        </div>

        <div style={{ fontSize: 46, marginBottom: 8 }}>🎉</div>
        <h1
          style={{
            fontFamily: "var(--po)",
            fontWeight: 800,
            fontSize: "clamp(22px,5vw,30px)",
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "0 0 8px",
          }}
        >
          ¡Pago recibido!
        </h1>
        <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.55, margin: "0 0 22px" }}>
          Confirmá tu mail para crear tu cuenta y entrar. Todo lo que generaste queda vinculado.
        </p>

        <label style={{ display: "block", textAlign: "left", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
          Tu mail
        </label>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@email.com"
          value={email}
          disabled={working}
          onChange={(e) => {
            setEmail(e.target.value);
            if (phase === "error") setPhase("confirm");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 15px",
            fontSize: 15,
            borderRadius: 13,
            border: `1.5px solid ${phase === "error" ? "#ff5b71" : "rgba(139,92,246,.28)"}`,
            outline: "none",
            marginBottom: phase === "error" ? 8 : 14,
          }}
        />
        {phase === "error" && (
          <div style={{ fontSize: 13, color: "#d63a52", marginBottom: 14, fontWeight: 600, textAlign: "left" }}>{errMsg}</div>
        )}

        <button
          onClick={submit}
          disabled={working}
          style={{
            width: "100%",
            padding: "15px",
            border: "none",
            borderRadius: 14,
            background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
            color: "#fff",
            fontFamily: "var(--po)",
            fontWeight: 700,
            fontSize: 15.5,
            cursor: working ? "default" : "pointer",
            boxShadow: "0 8px 22px rgba(124,58,237,.28)",
            opacity: working ? 0.75 : 1,
          }}
        >
          {working ? "Creando tu cuenta…" : "Crear mi cuenta y entrar →"}
        </button>

        <p style={{ fontSize: 12, color: "var(--faint)", marginTop: 18, lineHeight: 1.5 }}>
          Sin contraseña. La próxima vez entrás con un código que te mandamos por mail.
        </p>
      </div>
    </main>
  );
}
