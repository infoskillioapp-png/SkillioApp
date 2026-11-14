"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track, pixel, markInitiateCheckout } from "@/lib/track-client";
import { GiftPopup } from "@/components/gift-popup";
import {
  DISCOUNT_CODE, PASE_ANCHOR_ARS, PASE_MAX_INSTALLMENTS, PASE_PRICE_ARS, PASE_PRICE_DISCOUNTED,
  PASE_SAVING_ARS, PRO_PRICE_ARS, PRO_PRICE_DISCOUNTED, cuota, fmtARS, productName, type SellablePlan,
} from "@/lib/pricing";

export type PaywallCtx = "flashcard" | "simulacro" | "resumen" | "generic" | "audio" | "limite";
// Preferencia que puede venir de la landing / links (?upgrade=…). Los valores
// viejos (semanal/trimestral) se tratan como Pase.
export type PlanPreference = "mensual" | "pase" | "semanal" | "trimestral" | null;

const CTX: Record<PaywallCtx, { image: string; title: string; sub: string }> = {
  flashcard: { image: "/paywalls/flashcard.jpeg", title: "Hay más tarjetas para dominar", sub: "Desbloqueá el mazo completo y dominá cada concepto." },
  simulacro: { image: "/paywalls/simulacro.jpeg", title: "Hay más preguntas en el simulacro", sub: "Completá el examen completo para detectar todas tus lagunas." },
  resumen: { image: "/paywalls/resumen.jpeg", title: "Hay más puntos clave en el resumen", sub: "Accedé al resumen completo y dominá cada tema de tu apunte." },
  generic: { image: "/paywalls/generic.jpeg", title: "Estudiá sin límites con PRO", sub: "Todo el contenido generado por Booki, sin restricciones." },
  audio: { image: "/paywalls/resumen.jpeg", title: "Escuchá tus resúmenes con PRO", sub: "Repasá en el colectivo o mientras caminás." },
  limite: { image: "/paywalls/upsell.jpeg", title: "Subí todos tus apuntes con PRO", sub: "Ya usaste tus apuntes gratis. Seguí sin límites." },
};

const FEATURES = [
  "Resúmenes, tarjetas y simulacros ilimitados",
  "IA que aprende con tu forma de estudiar",
  "Acceso a todos tus apuntes sin cortes",
];

type Props = {
  ctx: PaywallCtx;
  onClose: () => void;
  preferredPlan?: PlanPreference;
  dismissLabel?: string;
  /** Ofrecer el regalo 25% OFF al cerrar (una sola vez por usuario). */
  allowDiscount?: boolean;
};

export function SalePopup({ ctx, onClose, preferredPlan, dismissLabel = "Quizás después", allowDiscount = true }: Props) {
  const router = useRouter();
  const msg = CTX[ctx] ?? CTX.generic;
  const [plan, setPlan] = useState<SellablePlan>("pase");
  const [loading, setLoading] = useState(!!preferredPlan);
  const [phase, setPhase] = useState<"plans" | "discount">("plans");
  const [closing, setClosing] = useState(false);

  function navigateToCheckout(p: SellablePlan) {
    track("paywall_plan_click", p === "pro" ? "mensual" : "pase");
    pixel("InitiateCheckout", {
      value: p === "pase" ? PASE_PRICE_ARS : PRO_PRICE_ARS, currency: "ARS",
      content_name: productName(p, false), content_ids: [p], content_type: "product",
    });
    markInitiateCheckout();
    router.push(`/pagar?plan=${p}`);
  }

  function goToCheckout(p: SellablePlan) {
    setLoading(true);
    navigateToCheckout(p);
  }

  // Cerrar el paywall → (una sola vez por usuario) el regalo 25% OFF.
  async function handleClose() {
    if (closing) return;
    if (!allowDiscount) { onClose(); return; }
    setClosing(true);
    try {
      const r = await fetch("/api/public/discount-offer", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (d?.show) { setPhase("discount"); setClosing(false); return; }
    } catch { /* si falla, cerramos normal */ }
    onClose();
  }

  // Funnel + Meta: se mostró el paywall
  useEffect(() => {
    track("paywall_visto", ctx);
    pixel("ViewContent", { content_name: `Paywall ${ctx}`, content_category: "paywall", currency: "ARS" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Vino con un plan elegido desde la landing → directo al checkout
  useEffect(() => {
    if (!preferredPlan) return;
    navigateToCheckout(preferredPlan === "mensual" ? "pro" : "pase");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "discount") {
    return (
      <GiftPopup
        type="discount"
        eyebrow="🎁 SOLO PARA VOS"
        title="Te queremos adentro: 25% OFF"
        subtitle={
          <>
            Vimos que lo estás pensando. Dejanos tu mail y te regalamos <b>25% OFF</b>. Elegís dónde usarlo:
            <div style={{ marginTop: 12, textAlign: "left", display: "flex", flexDirection: "column", gap: 8 }}>
              <DiscountRow star title="⭐ Pase de cuatrimestre" note={`o ${PASE_MAX_INSTALLMENTS} cuotas de ${fmtARS(cuota(PASE_PRICE_DISCOUNTED))} · pago único`} old={PASE_PRICE_ARS} now={PASE_PRICE_DISCOUNTED} tag="4 meses" />
              <DiscountRow title="Mensual" note={`después ${fmtARS(PRO_PRICE_ARS)}/mes`} old={PRO_PRICE_ARS} now={PRO_PRICE_DISCOUNTED} tag="primer mes" />
            </div>
          </>
        }
        ctaText="Enviame el código 25% OFF"
        successText="¡Tu código va en camino! 🎟️"
        successAction={{
          label: "Usar mi descuento ahora →",
          href: `/pagar?plan=pase&promo=${DISCOUNT_CODE}`,
          onClick: () => track("descuento_usar_ahora", null),
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,8,28,.80)",
        backdropFilter: "blur(10px)",
        zIndex: 100,
        display: "flex",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        padding: "16px 14px",
      }}
    >
      <style>{SP_CSS}</style>
      <div className="sp-card">
        <button onClick={handleClose} aria-label="Cerrar" className="sp-x">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div style={{ maxHeight: "min(30vw, 160px)", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={msg.image} alt="" style={{ width: "100%", display: "block", objectFit: "cover" }} />
        </div>

        <div style={{ padding: "16px 18px 20px" }}>
          <h3 className="sp-title">{msg.title}</h3>
          <p className="sp-sub">{msg.sub}</p>

          <div className="sp-feats">
            {FEATURES.map((f) => (
              <div key={f} className="sp-feat">
                <span className="sp-check"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div role="radiogroup" aria-label="Elegí tu plan">
            {/* Pase — destacado y preseleccionado */}
            <button type="button" role="radio" aria-checked={plan === "pase"} className={`sp-plan ${plan === "pase" ? "on" : ""}`} onClick={() => setPlan("pase")} disabled={loading}>
              <span className="sp-badge">⭐ EL MÁS ELEGIDO</span>
              <span className="sp-radio" />
              <span className="sp-body">
                <span className="sp-name">Pase de cuatrimestre</span>
                <span className="sp-claim">Cubrí todo tu cuatrimestre y salvá la materia</span>
                <span className="sp-anchor">4 meses en mensual = <s>{fmtARS(PASE_ANCHOR_ARS)}</s> · <b>ahorrás {fmtARS(PASE_SAVING_ARS)}</b></span>
              </span>
              <span className="sp-price">
                <b>{fmtARS(PASE_PRICE_ARS)}</b>
                <small>o {PASE_MAX_INSTALLMENTS} cuotas sin interés de {fmtARS(cuota(PASE_PRICE_ARS))}</small>
              </span>
            </button>

            {/* Mensual */}
            <button type="button" role="radio" aria-checked={plan === "pro"} className={`sp-plan ${plan === "pro" ? "on" : ""}`} onClick={() => setPlan("pro")} disabled={loading}>
              <span className="sp-radio" />
              <span className="sp-body">
                <span className="sp-name">Mensual</span>
                <span className="sp-claim">Cancelás cuando quieras</span>
              </span>
              <span className="sp-price">
                <b>{fmtARS(PRO_PRICE_ARS)}</b>
                <small>por mes</small>
              </span>
            </button>
          </div>

          <button className="sp-cta" onClick={() => goToCheckout(plan)} disabled={loading}>
            {loading ? "Abriendo checkout…" : "Continuar →"}
          </button>

          <div style={{ textAlign: "center" }}>
            <button onClick={handleClose} className="sp-dismiss" disabled={closing}>{dismissLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscountRow({ star = false, title, note, old, now, tag }: { star?: boolean; title: string; note: string; old: number; now: number; tag: string }) {
  return (
    <div style={{ background: star ? "linear-gradient(135deg,#f3f0ff,#eef2ff)" : "#fafafe", border: `1.5px solid ${star ? "#8b5cf6" : "#e4e1f5"}`, borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#7c3aed" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#8a8399" }}>{note}</div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 11.5, color: "#9a8f80", textDecoration: "line-through" }}>{fmtARS(old)}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink,#1f2347)", lineHeight: 1.1 }}>{fmtARS(now)}</div>
        <div style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700 }}>{tag}</div>
      </div>
    </div>
  );
}

const SP_CSS = `
.sp-card{background:#fff;border-radius:28px;box-shadow:0 32px 80px rgba(0,0,0,.35),0 0 0 1px rgba(139,92,246,.12);width:min(420px,100%);overflow:hidden;animation:fadeUp .28s cubic-bezier(.22,1,.36,1) both;position:relative;margin:auto}
.sp-x{position:absolute;top:12px;right:12px;z-index:10;width:32px;height:32px;border-radius:999px;background:rgba(0,0,0,.45);border:none;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(4px)}
.sp-title{font-family:var(--po);font-weight:800;font-size:18px;color:var(--ink);margin:0 0 4px;line-height:1.25}
.sp-sub{font-size:13px;color:var(--muted);margin:0 0 12px;line-height:1.45}
.sp-feats{background:linear-gradient(135deg,#f5f3ff,#eef2ff);border-radius:16px;padding:10px 14px;margin-bottom:16px;display:flex;flex-direction:column;gap:7px}
.sp-feat{display:flex;align-items:center;gap:10px;font-size:12.5px;color:#3b3558;font-weight:500;line-height:1.35}
.sp-check{width:19px;height:19px;border-radius:999px;flex-shrink:0;background:linear-gradient(135deg,#8b5cf6,#4f7dff);display:grid;place-items:center}
.sp-plan{position:relative;display:flex;align-items:center;gap:11px;width:100%;text-align:left;cursor:pointer;background:#fff;border:1.5px solid #e6e2f5;border-radius:18px;padding:15px 13px;margin-bottom:10px;font:inherit;color:var(--ink);transition:border-color .15s,box-shadow .15s}
.sp-plan:first-child{margin-top:8px}
.sp-plan.on{border-color:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,.16),0 10px 24px rgba(124,58,237,.14);background:linear-gradient(135deg,#faf8ff,#f3f0ff)}
.sp-badge{position:absolute;top:-10px;left:13px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-size:10px;font-weight:800;letter-spacing:.05em;border-radius:999px;padding:3px 10px}
.sp-radio{flex:none;width:19px;height:19px;border-radius:999px;border:2px solid #c9c3e6;display:grid;place-items:center}
.sp-plan.on .sp-radio{border-color:#7c3aed}
.sp-plan.on .sp-radio::after{content:"";width:9px;height:9px;border-radius:999px;background:#7c3aed}
.sp-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.sp-name{font-family:var(--po);font-weight:800;font-size:14.5px}
.sp-claim{font-size:11.5px;color:var(--muted);line-height:1.3}
.sp-anchor{font-size:11px;color:#3b3558;margin-top:3px;line-height:1.3}
.sp-anchor s{color:var(--muted)}
.sp-anchor b{color:#16a34a}
.sp-price{flex:none;display:flex;flex-direction:column;align-items:flex-end;text-align:right;max-width:40%}
.sp-price b{font-family:var(--po);font-weight:900;font-size:18px;line-height:1.1}
.sp-price small{font-size:10px;color:var(--muted);line-height:1.3;margin-top:2px}
.sp-cta{width:100%;margin:6px 0 12px;padding:15px;border:none;border-radius:16px;background:linear-gradient(135deg,#8b5cf6,#4f7dff);color:#fff;font-family:var(--po);font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 10px 26px rgba(124,58,237,.38);transition:transform .12s}
.sp-cta:hover:not(:disabled){transform:translateY(-1px)}
.sp-cta:disabled{opacity:.75;cursor:default}
.sp-dismiss{background:none;border:none;font-size:12px;color:var(--muted);cursor:pointer;opacity:.6}
`;
