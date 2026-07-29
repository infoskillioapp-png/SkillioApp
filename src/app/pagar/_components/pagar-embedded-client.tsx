"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SkillioMark } from "@/app/_components/landing/landing-top";

// El Brick de MP es 100% cliente (usa window). Lo cargamos con ssr:false.
const EmbeddedCheckout = dynamic(
  () => import("./embedded-checkout").then((m) => m.EmbeddedCheckout),
  { ssr: false },
);

const FEATURES = [
  "Resumen, tarjetas, simulacros y juegos con tu propio apunte",
  "Modelo de máxima calidad en resúmenes",
  "Acceso completo sin cortes a todos tus apuntes",
];

// Por qué pedimos cada dato — despeja dudas justo donde aparecen los campos.
const CUENTA_INFO: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <IconMail />,
    title: "Tu mail crea tu cuenta",
    body: "Con el mail que dejes armamos tu acceso. Nada de formularios extra.",
  },
  {
    icon: <IconKey />,
    title: "Ingresás sin contraseña",
    body: "Cada vez que entres te mandamos un código al mail. Más simple y más seguro: no usamos contraseñas.",
  },
  {
    icon: <IconPhone />,
    title: "Tu teléfono, por las dudas",
    body: "Lo usamos solo para contactarte si hay algún problema con tu cuenta o tu pago.",
  },
  {
    icon: <IconHeadset />,
    title: "Soporte 24/7",
    body: "Ante cualquier inconveniente escribinos y te resolvemos. Siempre hay alguien del otro lado.",
  },
];

export function PagarEmbeddedClient({ initialEmail = "" }: { initialEmail?: string }) {
  return (
    <div className="pagar-wrap">
      <style>{PAGAR_CSS}</style>

      <div className="pagar-inner">
        {/* Topbar */}
        <div className="pagar-top">
          <SkillioMark size={28} />
          <Link href="/app" className="pagar-back">Volver</Link>
        </div>

        {/* Hero — misma identidad que la home (.hero) */}
        <section className="hero pagar-hero in">
          <div className="htx">
            <div className="pagar-planrow">
              <span className="pagar-plan">Mensual PRO</span>
              <span className="pagar-price">$15.900</span>
              <span className="pagar-per">/ mes</span>
            </div>
            <ul className="pagar-feats">
              {FEATURES.map((f) => (
                <li key={f}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="pagar-claim">✨ Aprobá más fácil y divertite estudiando</div>
          </div>
          <div className="hero-booki" aria-hidden>
            <Image
              src="/booki_home.png"
              alt=""
              width={320}
              height={400}
              priority
              style={{
                width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 14%",
                WebkitMaskImage: "radial-gradient(72% 78% at 62% 40%, #000 48%, transparent 76%)",
                maskImage: "radial-gradient(72% 78% at 62% 40%, #000 48%, transparent 76%)",
                animation: "bookiFloat 4.4s ease-in-out infinite",
              }}
            />
          </div>
        </section>

        {/* Banner de confianza — Mercado Pago bien visible */}
        <div className="mp-trust in">
          <span className="mp-lock" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
          <div className="mp-trust-tx">
            <div className="mp-trust-title">
              Pago 100% protegido por <span className="mp-brand">Mercado&nbsp;Pago</span>
            </div>
            <div className="mp-trust-sub">Tus datos viajan cifrados. La tarjeta nunca pasa por Skillio.</div>
          </div>
        </div>

        {/* Formulario (Brick) */}
        <div className="pagar-card in">
          <div className="pagar-card-head">
            <h2>Completá tu pago</h2>
            <p>Ingresá tu tarjeta de crédito o débito y tu mail para crear la cuenta.</p>
          </div>
          <EmbeddedCheckout initialEmail={initialEmail} />
        </div>

        {/* Cómo funciona tu cuenta */}
        <div className="pagar-info in">
          <div className="pagar-info-h">Qué pasa después de pagar</div>
          <div className="pagar-info-grid">
            {CUENTA_INFO.map((it) => (
              <div key={it.title} className="pagar-info-item">
                <span className="pagar-info-ic">{it.icon}</span>
                <div>
                  <div className="pagar-info-title">{it.title}</div>
                  <div className="pagar-info-body">{it.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sellos de seguridad — prominentes, no escondidos */}
        <div className="pagar-seals in">
          <div className="pagar-seal"><IconShield /> Pago cifrado</div>
          <div className="pagar-seal"><IconRefresh /> Sin permanencia</div>
          <div className="pagar-seal"><IconX /> Cancelás cuando quieras</div>
        </div>

        <p className="pagar-fine">
          Se renueva automáticamente cada mes. Podés cancelar en un clic desde tu perfil.
          Al continuar aceptás los <a href="/terminos">términos y condiciones</a>.
        </p>
      </div>
    </div>
  );
}

// ── íconos ──
function IconMail() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}
function IconKey() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="3.5" /><path d="m10 13 8-8M17 4l3 3-2.5 2.5L15 7" /></svg>;
}
function IconPhone() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></svg>;
}
function IconHeadset() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="2" y="14" width="4" height="6" rx="1.5" /><rect x="18" y="14" width="4" height="6" rx="1.5" /><path d="M20 20a4 4 0 0 1-4 3h-2" /></svg>;
}
function IconShield() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" /><path d="m9 12 2 2 4-4" /></svg>;
}
function IconRefresh() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>;
}
function IconX() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></svg>;
}

const PAGAR_CSS = `
.pagar-wrap{position:fixed;inset:0;overflow-y:auto;-webkit-overflow-scrolling:touch;
  background:radial-gradient(1100px 520px at 50% -8%, rgba(139,92,246,.14), transparent 60%), var(--bg);
  padding:22px 16px 56px}
.pagar-inner{width:100%;max-width:460px;margin:0 auto}
.pagar-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
.pagar-back{font-size:12.5px;color:var(--muted);text-decoration:none;padding:6px 12px;border-radius:999px;border:1px solid var(--line);background:#fff;transition:.15s}
.pagar-back:hover{color:var(--ink);border-color:#d9dcea}

/* Hero: reusa .hero global (mismo gradiente/gloss que la home) */
.pagar-hero{min-height:200px;padding:24px 26px;margin-bottom:14px}
.pagar-hero .htx{max-width:76%}
.pagar-planrow{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:12px}
.pagar-plan{font-family:var(--po);font-weight:800;font-size:20px;color:#fff}
.pagar-price{font-family:var(--po);font-weight:900;font-size:24px;color:#fff;line-height:1}
.pagar-per{font-size:12px;color:rgba(255,255,255,.82)}
.pagar-feats{list-style:none;display:flex;flex-direction:column;gap:8px;margin:0;padding:0}
.pagar-feats li{display:flex;align-items:flex-start;gap:9px;font-size:13px;line-height:1.35;color:rgba(255,255,255,.95)}
.pagar-feats svg{flex:none;margin-top:1px}
.pagar-claim{margin-top:13px;font-family:var(--po);font-weight:700;font-size:14px;color:#fff;display:flex;align-items:center;gap:7px}
@media(max-width:520px){.pagar-hero .htx{max-width:100%}.pagar-hero .hero-booki{opacity:.32;width:190px}}

/* Banner Mercado Pago */
.mp-trust{display:flex;align-items:center;gap:13px;background:linear-gradient(135deg,#00b1ea,#009ee3);
  border-radius:16px;padding:13px 16px;margin-bottom:14px;box-shadow:0 10px 26px rgba(0,158,227,.32)}
.mp-lock{flex:none;width:38px;height:38px;border-radius:11px;background:rgba(255,255,255,.22);display:grid;place-items:center}
.mp-trust-title{font-family:var(--po);font-weight:700;font-size:14px;color:#fff;line-height:1.25}
.mp-brand{font-weight:800}
.mp-trust-sub{font-size:11.5px;color:rgba(255,255,255,.9);margin-top:2px;line-height:1.3}

/* Card del formulario */
.pagar-card{background:#fff;border:1px solid var(--line);border-radius:24px;padding:20px 20px 22px;box-shadow:0 18px 48px rgba(40,30,90,.12);margin-bottom:16px}
.pagar-card-head{margin-bottom:14px}
.pagar-card-head h2{font-family:var(--po);font-weight:800;font-size:18px;color:var(--ink);margin:0 0 3px}
.pagar-card-head p{font-size:12.5px;color:var(--muted);line-height:1.45;margin:0}

/* Info cuenta */
.pagar-info{background:#fff;border:1px solid var(--line);border-radius:20px;padding:16px 18px;margin-bottom:14px}
.pagar-info-h{font-family:var(--po);font-weight:800;font-size:13px;letter-spacing:.02em;color:var(--ink);margin-bottom:12px}
.pagar-info-grid{display:flex;flex-direction:column;gap:13px}
.pagar-info-item{display:flex;gap:12px;align-items:flex-start}
.pagar-info-ic{flex:none;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:#7c3aed;background:linear-gradient(135deg,rgba(139,92,246,.14),rgba(79,125,255,.12))}
.pagar-info-title{font-family:var(--po);font-weight:700;font-size:13.5px;color:var(--ink);margin-bottom:1px}
.pagar-info-body{font-size:12.5px;color:var(--muted);line-height:1.45}

/* Sellos */
.pagar-seals{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:14px}
.pagar-seal{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#3d8b5f;background:rgba(52,199,120,.10);border:1px solid rgba(52,199,120,.24);border-radius:999px;padding:7px 13px}

.pagar-fine{text-align:center;font-size:11.5px;color:var(--muted);line-height:1.5;margin:0}
.pagar-fine a{color:var(--muted);text-decoration:underline}
`;
