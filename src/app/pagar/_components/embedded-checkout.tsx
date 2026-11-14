"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { initMercadoPago, CardPayment, Payment } from "@mercadopago/sdk-react";
import { pixel, track, consumeInitiateCheckoutMark } from "@/lib/track-client";
import {
  DISCOUNT_CODE, DISCOUNT_PCT, PASE_MAX_INSTALLMENTS, PRO_PRICE_ARS, PASE_PRICE_ARS,
  cuota, fmtARS, isValidDiscountCode, priceFor, productName, type SellablePlan,
} from "@/lib/pricing";

// Checkout EMBEBIDO en 2 PASOS:
//   Paso 1 (datos): mail + teléfono (+ código opcional) → se guardan ANTES del
//     pago (si abandonan en el paso 2, quedamos con el contacto).
//   Paso 2 (pago):
//     · Mensual → Card Brick (suscripción, solo tarjeta, 1 pago).
//     · Pase → Payment Brick (pago único): tarjeta en hasta 3 cuotas sin
//       interés, débito, dinero en cuenta de Mercado Pago y efectivo.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let mpInitDone = false;

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

type Props = {
  plan: SellablePlan;
  initialEmail?: string;
  promoInput: string;
  setPromoInput: (v: string) => void;
};

export function EmbeddedCheckout({ plan, initialEmail = "", promoInput, setPromoInput }: Props) {
  const router = useRouter();
  const { signIn } = useSignIn();

  const [step, setStep] = useState<"datos" | "pago">("datos");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [savingLead, setSavingLead] = useState(false);

  // Código SKILLIO25: vale para los 2 planes. Se aplica solo apenas es válido.
  const promoApplied = isValidDiscountCode(promoInput);
  const promoTyped = promoInput.trim().length > 0;
  const amount = priceFor(plan, promoApplied);
  const fullPrice = plan === "pase" ? PASE_PRICE_ARS : PRO_PRICE_ARS;

  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pase: preferencia para pagar con dinero en cuenta de MP (opcional: si
  // falla, el Brick se muestra igual sin esa opción).
  // Se guarda junto con la clave de lo que la generó: si cambia el código o
  // los datos, se pide una nueva (y mientras tanto se considera "cargando").
  const prefKey = `${plan}|${promoApplied}|${email}|${phone}`;
  const [pref, setPref] = useState<{ key: string; id: string | null } | null>(null);
  const prefLoaded = pref?.key === prefKey;
  const preferenceId = prefLoaded ? pref!.id : null;
  // Pase en efectivo / en revisión: se activa cuando MP lo apruebe.
  const [pending, setPending] = useState<{ voucherUrl: string | null } | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (publicKey && !mpInitDone) {
      initMercadoPago(publicKey, { locale: "es-AR" });
      mpInitDone = true;
    }
  }, []);

  // Al llegar al paso del pago del Pase, pedimos la preferencia (dinero en cuenta).
  useEffect(() => {
    if (step !== "pago" || plan !== "pase") return;
    let cancelled = false;
    fetch("/api/checkout/pase/preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, promo: promoApplied ? DISCOUNT_CODE : undefined }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setPref({ key: prefKey, id: d?.preference_id ?? null }); })
      // Sin dinero en cuenta: el resto de los medios sigue funcionando.
      .catch(() => { if (!cancelled) setPref({ key: prefKey, id: null }); });
    return () => { cancelled = true; };
  }, [step, plan, promoApplied, email, phone, prefKey]);

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
    // Meta: inicio de checkout con el plan elegido — solo si el paywall no lo
    // mandó ya (llegó desde el mail del descuento o un link directo).
    if (!consumeInitiateCheckoutMark()) {
      pixel("InitiateCheckout", {
        value: amount, currency: "ARS",
        content_name: productName(plan, promoApplied), content_ids: [plan], content_type: "product",
      });
    }
    track("checkout_paso_pago", promoApplied ? `${plan}_skillio25` : plan);
    setReady(false);
    setStep("pago");
  }

  async function loginWithTicket(token: string | null | undefined): Promise<boolean> {
    if (!token) return true;
    if (!signIn) { router.replace("/login"); return false; }
    const ticketRes = await signIn.ticket({ ticket: token });
    if (ticketRes.error) { router.replace("/login"); return false; }
    const finRes = await signIn.finalize();
    if (finRes.error) { router.replace("/login"); return false; }
    return true;
  }

  // ── Mensual: suscripción con tarjeta ──
  async function handleMensualSubmit(formData: { token?: string; payer?: { email?: string } }) {
    setError(null);
    setProcessing(true);
    try {
      const res = await fetch("/api/subscription/create-embedded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_token: formData.token, email: email || formData.payer?.email, phone, plan: "pro", promo: promoApplied ? DISCOUNT_CODE : undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 402 || data?.error === "card_declined") {
        setError("No pudimos procesar el pago con esa tarjeta. Revisá los datos o probá con otra.");
        setProcessing(false);
        return;
      }
      if (!res.ok) { setError("No pudimos procesar el pago. Probá de nuevo en un momento."); setProcessing(false); return; }
      if (data.pending) { router.replace("/pago-exitoso"); return; }

      // Activación de la suscripción (la plata entra cuando MP cobra: ahí sale
      // el Purchase por CAPI desde el webhook).
      pixel("StartTrial", { value: amount, currency: "ARS", content_name: productName("pro", promoApplied) });
      if (!(await loginWithTicket(data.token))) return;
      router.replace("/gracias?plan=pro");
    } catch {
      setError("Algo salió mal. Si el cobro se hizo, tu cuenta se activará sola.");
      setProcessing(false);
    }
  }

  // ── Pase: pago único (tarjeta / débito / efectivo; dinero en cuenta redirige a MP) ──
  async function handlePaseSubmit(param: { selectedPaymentMethod?: string; formData?: unknown }) {
    // Dinero en cuenta: el Brick lleva al usuario a Mercado Pago y vuelve a /pago-pase.
    if (param.selectedPaymentMethod === "wallet_purchase" || !param.formData) return;
    setError(null);
    setProcessing(true);
    try {
      const res = await fetch("/api/checkout/pase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: param.formData, email, phone, promo: promoApplied ? DISCOUNT_CODE : undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message ?? (data?.error === "already_subscribed"
          ? "Ya tenés un plan activo. Entrá a la app para seguir estudiando."
          : "No pudimos procesar el pago. Probá de nuevo o con otro medio."));
        setProcessing(false);
        return;
      }
      if (data.status === "pending") {
        setPending({ voucherUrl: data.voucher_url ?? null });
        setProcessing(false);
        return;
      }
      // Aprobado: Purchase del navegador con el MISMO id que el del servidor.
      pixel("Purchase", {
        value: data.value ?? amount, currency: "ARS",
        content_name: productName("pase", !!data.promo), content_ids: ["pase"], content_type: "product",
      }, `purchase_${data.payment_id}`);
      if (!(await loginWithTicket(data.token))) return;
      router.replace("/gracias?plan=pase");
    } catch {
      setError("Algo salió mal. Si el cobro se hizo, tu cuenta se activará sola y te llega un mail.");
      setProcessing(false);
    }
  }

  const priceBlock = (
    <div className="ck-price">
      {promoApplied ? (
        <>
          <span className="ck-price-now"><s className="ck-price-old">{fmtARS(fullPrice)}</s> <b>{fmtARS(amount)}</b>{plan === "pro" ? " el primer mes" : ""}</span>
          <span className="ck-price-then">{plan === "pro" ? `luego ${fmtARS(PRO_PRICE_ARS)}/mes` : `o ${PASE_MAX_INSTALLMENTS} cuotas sin interés de ${fmtARS(cuota(amount))}`}</span>
        </>
      ) : plan === "pase" ? (
        <>
          <span className="ck-price-now"><b>{fmtARS(amount)}</b> pago único</span>
          <span className="ck-price-then">o {PASE_MAX_INSTALLMENTS} cuotas sin interés de {fmtARS(cuota(amount))}</span>
        </>
      ) : (
        <span className="ck-price-now"><b>{fmtARS(amount)}</b>/mes</span>
      )}
    </div>
  );

  if (pending) {
    return (
      <div className="ck-pending">
        <style>{CK_CSS}</style>
        <div style={{ fontSize: 38 }}>🧾</div>
        <h3>¡Ya casi!</h3>
        {pending.voucherUrl ? (
          <>
            <p>Pagá el cupón en <b>Rapipago o Pago Fácil</b>. Apenas se acredite, tu Pase se activa solo y te llega un mail a <b>{email}</b>.</p>
            <a className="ck-cta" href={pending.voucherUrl} target="_blank" rel="noreferrer" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>Ver mi cupón de pago →</a>
          </>
        ) : (
          <p>Mercado Pago está revisando tu pago. Te avisamos por mail a <b>{email}</b> apenas se apruebe (suele tardar unos minutos).</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <style>{CK_CSS}</style>

      {error && <div className="ck-error">{error}</div>}

      {step === "datos" ? (
        <div className="ck-datos">
          {promoApplied && (
            <div className="ck-pb">
              <div className="ck-pb-top">🎟️ Tenés {DISCOUNT_PCT}% OFF con {DISCOUNT_CODE}</div>
              <div className="ck-pb-price"><s>{fmtARS(fullPrice)}</s> <b>{fmtARS(amount)}</b>{plan === "pro" ? ` primer mes · luego ${fmtARS(PRO_PRICE_ARS)}/mes` : " · pago único"}</div>
              <div className="ck-pb-cta">Completá tus datos y el descuento se aplica automáticamente.</div>
            </div>
          )}
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

          {/* Código de descuento — se aplica solo al ser válido */}
          {promoApplied ? (
            <div className="ck-promo-ok">
              <span>🎟️ Código <b>{DISCOUNT_CODE}</b> aplicado — {DISCOUNT_PCT}% OFF{plan === "pro" ? " el primer mes" : ""}</span>
              <button onClick={() => setPromoInput("")} className="ck-promo-remove">Quitar</button>
            </div>
          ) : (
            <input
              className="ck-input" style={{ marginBottom: 6 }} type="text"
              placeholder="¿Tenés un código de descuento?" value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
            />
          )}
          {promoTyped && !promoApplied && <div className="ck-promo-err">Ese código no es válido.</div>}

          {priceBlock}

          <div style={{ position: "relative", minHeight: ready ? undefined : 320 }}>
            {!ready && <div style={{ position: "absolute", inset: 0, zIndex: 2 }}><FormSkeleton /></div>}
            <div style={{ opacity: processing ? 0.5 : 1, pointerEvents: processing ? "none" : "auto", transition: "opacity .2s" }}>
              {plan === "pro" ? (
                <CardPayment
                  key={`pro-${amount}`}
                  initialization={{ amount, payer: { email } }}
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
                  onSubmit={handleMensualSubmit}
                  onError={() => setError("Revisá los datos de la tarjeta e intentá de nuevo.")}
                />
              ) : prefLoaded ? (
                <Payment
                  key={`pase-${amount}-${preferenceId ?? "nopref"}`}
                  initialization={{ amount, payer: { email }, ...(preferenceId ? { preferenceId } : {}) }}
                  customization={{
                    paymentMethods: {
                      creditCard: "all",
                      debitCard: "all",
                      ticket: "all",
                      ...(preferenceId ? { mercadoPago: "all" as const } : {}),
                      maxInstallments: PASE_MAX_INSTALLMENTS,
                    },
                    visual: {
                      style: {
                        theme: "default",
                        customVariables: { baseColor: "#7c3aed", borderRadiusMedium: "12px", borderRadiusLarge: "14px", fontSizeMedium: "15px" },
                      },
                    },
                  }}
                  onReady={() => setReady(true)}
                  onSubmit={handlePaseSubmit as never}
                  onError={() => setError("Revisá los datos del pago e intentá de nuevo.")}
                />
              ) : null}
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
.ck-pb{background:linear-gradient(135deg,#f3f0ff,#eef2ff);border:1.5px solid #c4b5fd;border-radius:14px;padding:13px 15px;margin-bottom:16px}
.ck-pb-top{font-family:var(--po);font-weight:800;font-size:14px;color:#7c3aed;margin-bottom:3px}
.ck-pb-price{font-size:13px;color:var(--ink)}
.ck-pb-price s{color:var(--muted)}
.ck-pb-price b{font-family:var(--po);font-weight:800;font-size:16px}
.ck-pb-cta{font-weight:800;font-size:12.5px;color:#1f2347;margin-top:7px}
.ck-promo-ok{display:flex;align-items:center;justify-content:space-between;gap:10px;background:rgba(52,199,120,.10);border:1px solid rgba(52,199,120,.28);border-radius:12px;padding:10px 13px;font-size:12.5px;color:#2f7a4f;margin-bottom:6px}
.ck-promo-remove{background:none;border:none;color:#2f7a4f;font-weight:700;font-size:12px;cursor:pointer;text-decoration:underline;white-space:nowrap}
.ck-promo-err{font-size:12px;color:#d63a52;font-weight:600;margin-bottom:6px}
.ck-price{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:6px 0 16px;font-size:14px;color:var(--ink)}
.ck-price-now b{font-family:var(--po);font-weight:800;font-size:18px}
.ck-price-old{color:var(--muted);font-size:13px}
.ck-price-then{font-size:12.5px;color:var(--muted)}
.ck-cta{width:100%;box-sizing:border-box;padding:15px;border:none;border-radius:14px;background:linear-gradient(135deg,#8b5cf6,#4f7dff);color:#fff;font-family:var(--po);font-weight:700;font-size:15.5px;cursor:pointer;box-shadow:0 10px 24px rgba(124,58,237,.30);transition:transform .12s,box-shadow .12s}
.ck-cta:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 14px 30px rgba(124,58,237,.42)}
.ck-cta:disabled{opacity:.7;cursor:default}
.ck-payas{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#f4f2ff;border:1px solid rgba(139,92,246,.18);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--muted)}
.ck-payas b{color:var(--ink);font-weight:700;word-break:break-all}
.ck-change{background:none;border:none;color:#7c3aed;font-weight:700;font-size:12.5px;cursor:pointer;white-space:nowrap;text-decoration:underline}
.ck-processing{text-align:center;padding:12px 0 2px;color:#7c3aed;font-size:13px;font-weight:700}
.ck-pending{text-align:center;padding:10px 4px}
.ck-pending h3{font-family:var(--po);font-weight:800;font-size:20px;color:var(--ink);margin:6px 0 8px}
.ck-pending p{font-size:14px;color:var(--muted);line-height:1.55;margin:0 0 16px}
.ck-skel{display:flex;flex-direction:column;gap:14px;padding:4px 0}
.ck-skel-row{display:flex;gap:12px}
.ck-skel-box,.ck-skel-btn{border-radius:10px;background:linear-gradient(100deg,#eef0f6 30%,#f7f8fc 50%,#eef0f6 70%);background-size:220% 100%;animation:ckShim 1.25s linear infinite;height:46px}
.ck-skel-btn{height:50px;border-radius:14px;margin-top:6px}
@keyframes ckShim{from{background-position:180% 0}to{background-position:-40% 0}}
@media(prefers-reduced-motion:reduce){.ck-skel-box,.ck-skel-btn{animation:none}}
`;
