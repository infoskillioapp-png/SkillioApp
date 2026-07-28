"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

// Checkout EMBEBIDO del plan Mensual (Bricks). El usuario ingresa la tarjeta
// acá dentro (nunca sale de Skillio); el SDK la tokeniza en el navegador y nos
// manda solo el token. Con eso el server crea la suscripción y activa el plan.
//
// Dos flujos de salida:
//  - Anónimo: el server devuelve un sign-in token → auto-login → /app.
//  - Logueado: el server ya activó el plan → /app.

const PRO_PRICE_ARS = 15900;

let mpInitDone = false;

function fireStartTrial() {
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq) return;
  fbq("track", "StartTrial", {
    value: PRO_PRICE_ARS,
    currency: "ARS",
    content_name: "Plan PRO Skillio",
  });
}

export function EmbeddedCheckout({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const { signIn } = useSignIn();
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (publicKey && !mpInitDone) {
      initMercadoPago(publicKey, { locale: "es-AR" });
      mpInitDone = true;
    }
  }, []);

  // onSubmit del Brick: ya tiene la tarjeta tokenizada. Creamos la suscripción
  // en el server y resolvemos el login/redirect. Debe devolver una promesa.
  async function handleSubmit(formData: { token?: string; payer?: { email?: string } }) {
    setError(null);
    setProcessing(true);
    try {
      const res = await fetch("/api/subscription/create-embedded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_token: formData.token,
          email: formData.payer?.email || initialEmail,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 402 || data?.error === "card_declined") {
        // TEMPORAL (debug del flujo real): mostramos el motivo crudo de MP.
        setError(
          data?.detail
            ? `La tarjeta fue rechazada. Motivo (MP): ${data.detail}`
            : "La tarjeta fue rechazada. Probá con otra o revisá los datos.",
        );
        setProcessing(false);
        return;
      }
      if (!res.ok) {
        setError("No pudimos procesar el pago. Probá de nuevo en un momento.");
        setProcessing(false);
        return;
      }

      if (data.pending) {
        // MP no autorizó al instante: la sub quedó creada, el webhook activará.
        router.replace("/pago-exitoso");
        return;
      }

      fireStartTrial();

      // Anónimo: auto-login con el sign-in token (ticket + finalize).
      if (data.token) {
        if (!signIn) {
          router.replace("/login");
          return;
        }
        const ticketRes = await signIn.ticket({ ticket: data.token });
        if (ticketRes.error) { router.replace("/login"); return; }
        const finRes = await signIn.finalize();
        if (finRes.error) { router.replace("/login"); return; }
      }

      router.replace("/app?upgraded=1");
    } catch {
      setError("Algo salió mal. Si el cobro se hizo, tu cuenta se activará sola.");
      setProcessing(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {error && (
        <div style={{ background: "rgba(255,91,113,.1)", border: "1px solid rgba(255,91,113,.4)", color: "#d63a52", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {!ready && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-soft, #64748b)", fontSize: 13 }}>
          Cargando el pago seguro…
        </div>
      )}

      <div style={{ opacity: processing ? 0.5 : 1, pointerEvents: processing ? "none" : "auto" }}>
        <CardPayment
          initialization={{ amount: PRO_PRICE_ARS, payer: { email: initialEmail } }}
          customization={{
            paymentMethods: { maxInstallments: 1 },
            visual: { style: { theme: "default" } },
          }}
          onReady={() => setReady(true)}
          onSubmit={handleSubmit}
          onError={() => setError("Revisá los datos de la tarjeta e intentá de nuevo.")}
        />
      </div>

      {processing && (
        <div style={{ textAlign: "center", padding: "12px 0", color: "#8b5cf6", fontSize: 13, fontWeight: 700 }}>
          Procesando tu pago…
        </div>
      )}

      <p style={{ textAlign: "center", fontSize: 11, color: "var(--ink-softer, #94a3b8)", marginTop: 12 }}>
        🔒 Pago protegido por MercadoPago · Sin permanencia · Cancelás cuando quieras
      </p>
    </div>
  );
}
