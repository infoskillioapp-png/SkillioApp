"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

// Checkout EMBEBIDO del plan Mensual (Bricks). El usuario ingresa la tarjeta
// acá dentro (nunca sale de Skillio); el SDK la tokeniza en el navegador y nos
// manda solo el token. Con eso el server crea la suscripción y activa el plan.

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

// Skeleton con la forma del formulario de tarjeta: cubre el hueco mientras el
// Brick monta (arranca en unos segundos) para que no se sienta vacío/lento.
function FormSkeleton() {
  return (
    <div className="ck-skel" aria-hidden>
      <div className="ck-skel-line" style={{ width: "45%", height: 12 }} />
      <div className="ck-skel-box" />
      <div className="ck-skel-row">
        <div className="ck-skel-box" style={{ flex: 1 }} />
        <div className="ck-skel-box" style={{ flex: 1 }} />
      </div>
      <div className="ck-skel-box" />
      <div className="ck-skel-box" />
      <div className="ck-skel-btn" />
      <style>{`
        .ck-skel{display:flex;flex-direction:column;gap:14px;padding:4px 0}
        .ck-skel-row{display:flex;gap:12px}
        .ck-skel-line,.ck-skel-box,.ck-skel-btn{
          border-radius:10px;
          background:linear-gradient(100deg,#eef0f6 30%,#f7f8fc 50%,#eef0f6 70%);
          background-size:220% 100%;animation:ckShim 1.25s linear infinite}
        .ck-skel-box{height:46px}
        .ck-skel-btn{height:50px;border-radius:14px;margin-top:6px}
        @keyframes ckShim{from{background-position:180% 0}to{background-position:-40% 0}}
        @media(prefers-reduced-motion:reduce){.ck-skel-line,.ck-skel-box,.ck-skel-btn{animation:none}}
      `}</style>
    </div>
  );
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
        router.replace("/pago-exitoso");
        return;
      }

      fireStartTrial();

      if (data.token) {
        if (!signIn) { router.replace("/login"); return; }
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

      <div style={{ position: "relative", minHeight: ready ? undefined : 340 }}>
        {/* Skeleton encima hasta que el Brick esté listo */}
        {!ready && (
          <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
            <FormSkeleton />
          </div>
        )}

        <div style={{ opacity: processing ? 0.5 : 1, pointerEvents: processing ? "none" : "auto", transition: "opacity .2s" }}>
          <CardPayment
            initialization={{ amount: PRO_PRICE_ARS, payer: { email: initialEmail } }}
            customization={{
              paymentMethods: { maxInstallments: 1 },
              visual: {
                style: {
                  theme: "default",
                  customVariables: {
                    baseColor: "#7c3aed",
                    formBackgroundColor: "#ffffff",
                    borderRadiusMedium: "12px",
                    borderRadiusLarge: "14px",
                    fontSizeMedium: "15px",
                  },
                },
              },
            }}
            onReady={() => setReady(true)}
            onSubmit={handleSubmit}
            onError={() => setError("Revisá los datos de la tarjeta e intentá de nuevo.")}
          />
        </div>
      </div>

      {processing && (
        <div style={{ textAlign: "center", padding: "12px 0 2px", color: "#7c3aed", fontSize: 13, fontWeight: 700 }}>
          Procesando tu pago… no cierres esta ventana.
        </div>
      )}
    </div>
  );
}
