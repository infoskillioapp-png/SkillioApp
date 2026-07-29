"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

// Checkout EMBEBIDO del plan Mensual, en 2 PASOS:
//   Paso 1 (datos): mail + teléfono → se guardan ANTES de la tarjeta (así, si
//     abandonan en el paso 2, igual quedamos con el contacto para recuperarlos).
//   Paso 2 (tarjeta): Card Brick de MP con el mail ya prefilleado. Al pagar,
//     el server crea la suscripción y activa el plan (anon → auto-login).

const PRO_PRICE_ARS = 15900;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let mpInitDone = false;

function fireStartTrial() {
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
  if (!fbq) return;
  fbq("track", "StartTrial", { value: PRO_PRICE_ARS, currency: "ARS", content_name: "Plan PRO Skillio" });
}

const CUENTA_INFO: { icon: React.ReactNode; title: string; body: string }[] = [
  { icon: <IconMail />, title: "Tu mail crea tu cuenta", body: "Con el mail que dejes armamos tu acceso. Nada de formularios extra." },
  { icon: <IconKey />, title: "Ingresás sin contraseña", body: "Cada vez que entres te mandamos un código al mail. Más simple y más seguro." },
  { icon: <IconPhone />, title: "Tu teléfono, por las dudas", body: "Lo usamos solo para contactarte si hay algún problema con tu cuenta o tu pago." },
  { icon: <IconHeadset />, title: "Soporte 24/7", body: "Ante cualquier inconveniente escribinos y te resolvemos." },
];

function FormSkeleton() {
  return (
    <div className="ck-skel" aria-hidden>
      <div className="ck-skel-box" />
      <div className="ck-skel-row"><div className="ck-skel-box" style={{ flex: 1 }} /><div className="ck-skel-box" style={{ flex: 1 }} /></div>
      <div className="ck-skel-box" />
      <div className="ck-skel-btn" />
    </div>
  );
}

export function EmbeddedCheckout({ initialEmail = "" }: { initialEmail?: string }) {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [step, setStep] = useState<"datos" | "tarjeta">("datos");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [savingLead, setSavingLead] = useState(false);

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

  // Paso 1 → 2: valida y guarda el contacto (recuperación de abandonos).
  async function continuarAlPago() {
    setError(null);
    if (!EMAIL_RE.test(email)) { setError("Revisá que el mail esté bien escrito."); return; }
    if (phone.replace(/\D/g, "").length < 6) { setError("Ingresá un teléfono válido."); return; }
    setSavingLead(true);
    try {
      await fetch("/api/subscription/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
    } catch { /* no bloqueamos el pago si esto falla */ }
    setSavingLead(false);
    setStep("tarjeta");
  }

  // Paso 2: la tarjeta ya está tokenizada. Creamos la sub y resolvemos login.
  async function handleSubmit(formData: { token?: string; payer?: { email?: string } }) {
    setError(null);
    setProcessing(true);
    try {
      const res = await fetch("/api/subscription/create-embedded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_token: formData.token, email: email || formData.payer?.email, phone }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 402 || data?.error === "card_declined") {
        setError(data?.detail ? `La tarjeta fue rechazada. Motivo (MP): ${data.detail}` : "La tarjeta fue rechazada. Probá con otra o revisá los datos.");
        setProcessing(false);
        return;
      }
      if (!res.ok) { setError("No pudimos procesar el pago. Probá de nuevo en un momento."); setProcessing(false); return; }

      if (data.pending) { router.replace("/pago-exitoso"); return; }

      fireStartTrial();

      if (data.token) {
        if (!signIn) { router.replace("/login"); return; }
        const ticketRes = await signIn.ticket({ ticket: data.token });
        if (ticketRes.error) { router.replace("/login"); return; }
        const finRes = await signIn.finalize();
        if (finRes.error) { router.replace("/login"); return; }
      }
      router.replace("/gracias");
    } catch {
      setError("Algo salió mal. Si el cobro se hizo, tu cuenta se activará sola.");
      setProcessing(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <style>{CK_CSS}</style>

      {error && <div className="ck-error">{error}</div>}

      {step === "datos" ? (
        <div className="ck-datos">
          <label className="ck-label">Tu mail</label>
          <input
            className="ck-input" type="email" inputMode="email" autoComplete="email"
            placeholder="tu@email.com" value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("ck-phone")?.focus(); }}
          />

          <label className="ck-label" htmlFor="ck-phone">Tu teléfono</label>
          <input
            id="ck-phone" className="ck-input" type="tel" inputMode="tel" autoComplete="tel"
            placeholder="11 2345 6789" value={phone}
            onChange={(e) => { setPhone(e.target.value); if (error) setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") continuarAlPago(); }}
          />

          <div className="ck-info">
            {CUENTA_INFO.map((it) => (
              <div key={it.title} className="ck-info-item">
                <span className="ck-info-ic">{it.icon}</span>
                <div>
                  <div className="ck-info-title">{it.title}</div>
                  <div className="ck-info-body">{it.body}</div>
                </div>
              </div>
            ))}
          </div>

          <button className="ck-cta" onClick={continuarAlPago} disabled={savingLead}>
            {savingLead ? "Un segundo…" : "Continuar al pago →"}
          </button>
        </div>
      ) : (
        <div className="ck-tarjeta">
          <div className="ck-payas">
            <span>Pagás como <b>{email}</b></span>
            <button onClick={() => { setStep("datos"); setReady(false); }} className="ck-change">Cambiar</button>
          </div>

          <div style={{ position: "relative", minHeight: ready ? undefined : 320 }}>
            {!ready && <div style={{ position: "absolute", inset: 0, zIndex: 2 }}><FormSkeleton /></div>}
            <div style={{ opacity: processing ? 0.5 : 1, pointerEvents: processing ? "none" : "auto", transition: "opacity .2s" }}>
              <CardPayment
                initialization={{ amount: PRO_PRICE_ARS, payer: { email } }}
                customization={{
                  paymentMethods: { maxInstallments: 1 },
                  visual: {
                    hideFormTitle: true,
                    style: {
                      theme: "default",
                      customVariables: { baseColor: "#7c3aed", borderRadiusMedium: "12px", borderRadiusLarge: "14px", fontSizeMedium: "15px" },
                    },
                  },
                }}
                onReady={() => setReady(true)}
                onSubmit={handleSubmit}
                onError={() => setError("Revisá los datos de la tarjeta e intentá de nuevo.")}
              />
            </div>
          </div>

          {processing && <div className="ck-processing">Procesando tu pago… no cierres esta ventana.</div>}
        </div>
      )}
    </div>
  );
}

// ── íconos ──
function IconMail() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>; }
function IconKey() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="3.5" /><path d="m10 13 8-8M17 4l3 3-2.5 2.5L15 7" /></svg>; }
function IconPhone() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></svg>; }
function IconHeadset() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2" y="14" width="4" height="6" rx="1.5" /><rect x="18" y="14" width="4" height="6" rx="1.5" /><path d="M20 20a4 4 0 0 1-4 3h-2" /></svg>; }

const CK_CSS = `
.ck-error{background:rgba(255,91,113,.1);border:1px solid rgba(255,91,113,.4);color:#d63a52;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:600;margin-bottom:12px}
.ck-label{display:block;text-align:left;font-size:12.5px;font-weight:700;color:var(--ink);margin:0 0 6px}
.ck-input{width:100%;box-sizing:border-box;padding:13px 14px;font-size:15px;border-radius:12px;border:1.5px solid rgba(139,92,246,.28);outline:none;margin-bottom:14px;transition:border-color .15s}
.ck-input:focus{border-color:#8b5cf6}
.ck-info{display:flex;flex-direction:column;gap:12px;margin:4px 0 18px;padding:14px;border-radius:14px;background:#faf9ff;border:1px solid rgba(139,92,246,.14)}
.ck-info-item{display:flex;gap:11px;align-items:flex-start}
.ck-info-ic{flex:none;width:32px;height:32px;border-radius:9px;display:grid;place-items:center;color:#7c3aed;background:#fff;border:1px solid rgba(139,92,246,.16)}
.ck-info-title{font-family:var(--po);font-weight:700;font-size:13px;color:var(--ink);margin-bottom:1px}
.ck-info-body{font-size:12px;color:var(--muted);line-height:1.4}
.ck-cta{width:100%;padding:15px;border:none;border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#4f7dff);color:#fff;font-family:var(--po);font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 10px 24px rgba(124,58,237,.30);transition:transform .12s,box-shadow .12s}
.ck-cta:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 14px 30px rgba(124,58,237,.42)}
.ck-cta:disabled{opacity:.7;cursor:default}
.ck-payas{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f4f2ff;border:1px solid rgba(139,92,246,.18);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--muted)}
.ck-payas b{color:var(--ink);font-weight:700}
.ck-change{background:none;border:none;color:#7c3aed;font-weight:700;font-size:12.5px;cursor:pointer;white-space:nowrap;text-decoration:underline}
.ck-processing{text-align:center;padding:12px 0 2px;color:#7c3aed;font-size:13px;font-weight:700}
.ck-skel{display:flex;flex-direction:column;gap:14px;padding:4px 0}
.ck-skel-row{display:flex;gap:12px}
.ck-skel-box,.ck-skel-btn{border-radius:10px;background:linear-gradient(100deg,#eef0f6 30%,#f7f8fc 50%,#eef0f6 70%);background-size:220% 100%;animation:ckShim 1.25s linear infinite;height:46px}
.ck-skel-btn{height:50px;border-radius:14px;margin-top:6px}
@keyframes ckShim{from{background-position:180% 0}to{background-position:-40% 0}}
@media(prefers-reduced-motion:reduce){.ck-skel-box,.ck-skel-btn{animation:none}}
`;
