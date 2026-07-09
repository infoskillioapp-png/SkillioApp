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
// deslogueado:
//   1. confirma su mail (prefill con el de MP) → se crea la cuenta + se reclama
//      la sesión anónima → auto-login con sign-in token (ticket + finalize).
//   2. deja su teléfono de contacto (opcional) → entra a /app.
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
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"email" | "phone">("email");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  function goToApp() {
    router.replace("/app?upgraded=1");
  }

  async function createAccount() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrMsg("Revisá que el mail esté bien escrito.");
      return;
    }
    if (!signIn) {
      setErrMsg("Un segundo, todavía cargando… probá de nuevo.");
      return;
    }

    setBusy(true);
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
        setBusy(false);
        return;
      }

      fireStartTrial(data.plan ?? "pro", preapprovalId);

      // Auto-login con el sign-in token (ticket + finalize) — Clerk future API.
      const ticketRes = await signIn.ticket({ ticket: data.token });
      if (ticketRes.error) {
        router.replace("/login");
        return;
      }
      const finRes = await signIn.finalize();
      if (finRes.error) {
        router.replace("/login");
        return;
      }
      // Cuenta activa: pasamos al teléfono (opcional).
      setBusy(false);
      setStep("phone");
    } catch {
      setErrMsg("Algo salió mal. Tu pago está registrado — probá de nuevo.");
      setBusy(false);
    }
  }

  async function savePhone() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setErrMsg("Ingresá un teléfono válido o tocá 'Omitir'.");
      return;
    }
    setBusy(true);
    setErrMsg("");
    try {
      await fetch("/api/me/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
    } catch {
      /* no bloqueamos la entrada por el teléfono */
    }
    goToApp();
  }

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

        {step === "email" ? (
          <>
            <div style={{ fontSize: 46, marginBottom: 8 }}>🎉</div>
            <h1 style={titleStyle}>¡Pago recibido!</h1>
            <p style={subStyle}>
              Confirmá tu mail para crear tu cuenta y entrar. Todo lo que generaste queda vinculado.
            </p>

            <label style={labelStyle}>Tu mail</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="tu@email.com"
              value={email}
              disabled={busy}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errMsg) setErrMsg("");
              }}
              onKeyDown={(e) => e.key === "Enter" && createAccount()}
              style={inputStyle(!!errMsg)}
            />
            {errMsg && <div style={errStyle}>{errMsg}</div>}

            <button onClick={createAccount} disabled={busy} style={btnStyle(busy)}>
              {busy ? "Creando tu cuenta…" : "Crear mi cuenta y entrar →"}
            </button>

            <p style={footNote}>
              Sin contraseña. La próxima vez entrás con un código que te mandamos por mail.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 46, marginBottom: 8 }}>📱</div>
            <h1 style={titleStyle}>¡Cuenta lista!</h1>
            <p style={subStyle}>
              Última cosa: dejanos tu teléfono para poder contactarte si lo necesitás. Es opcional.
            </p>

            <label style={labelStyle}>Tu teléfono</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="11 2345 6789"
              value={phone}
              disabled={busy}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errMsg) setErrMsg("");
              }}
              onKeyDown={(e) => e.key === "Enter" && savePhone()}
              style={inputStyle(!!errMsg)}
            />
            {errMsg && <div style={errStyle}>{errMsg}</div>}

            <button onClick={savePhone} disabled={busy} style={btnStyle(busy)}>
              {busy ? "Guardando…" : "Guardar y entrar →"}
            </button>
            <button
              onClick={goToApp}
              disabled={busy}
              style={{
                width: "100%",
                marginTop: 10,
                background: "none",
                border: "none",
                fontSize: 13,
                color: "var(--muted)",
                cursor: "pointer",
                opacity: 0.7,
              }}
            >
              Omitir por ahora
            </button>
          </>
        )}
      </div>
    </main>
  );
}

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--po)",
  fontWeight: 800,
  fontSize: "clamp(22px,5vw,30px)",
  letterSpacing: "-0.02em",
  color: "var(--ink)",
  margin: "0 0 8px",
};

const subStyle: React.CSSProperties = {
  fontSize: 15,
  color: "var(--muted)",
  lineHeight: 1.55,
  margin: "0 0 22px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ink)",
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#d63a52",
  margin: "0 0 14px",
  fontWeight: 600,
  textAlign: "left",
};

const footNote: React.CSSProperties = {
  fontSize: 12,
  color: "var(--faint)",
  marginTop: 18,
  lineHeight: 1.5,
};

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    fontSize: 15,
    borderRadius: 13,
    border: `1.5px solid ${hasError ? "#ff5b71" : "rgba(139,92,246,.28)"}`,
    outline: "none",
    marginBottom: hasError ? 8 : 14,
  };
}

function btnStyle(busy: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "15px",
    border: "none",
    borderRadius: 14,
    background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
    color: "#fff",
    fontFamily: "var(--po)",
    fontWeight: 700,
    fontSize: 15.5,
    cursor: busy ? "default" : "pointer",
    boxShadow: "0 8px 22px rgba(124,58,237,.28)",
    opacity: busy ? 0.75 : 1,
  };
}
