import type { ReactNode } from "react";

type Props = {
  step: string;
  title: ReactNode;
  lead: ReactNode;
  children: ReactNode;
  footerLink?: ReactNode;
};

export function AuthShell({ step, title, lead, children, footerLink }: Props) {
  return (
    <>
      <style>{`
        /* ── SALTO real: impulso rápido, peak, caída, impacto ── */
        @keyframes bookiJump {
          0%   { transform: translateY(0px)   scaleX(1.06) scaleY(0.94); }
          12%  { transform: translateY(-20px)  scaleX(0.97) scaleY(1.03); }
          35%  { transform: translateY(-70px)  scaleX(0.94) scaleY(1.06); }
          55%  { transform: translateY(-70px)  scaleX(0.94) scaleY(1.06); }
          78%  { transform: translateY(-6px)   scaleX(0.98) scaleY(1.02); }
          88%  { transform: translateY(0px)    scaleX(1.10) scaleY(0.90); }
          94%  { transform: translateY(-18px)  scaleX(0.97) scaleY(1.03); }
          100% { transform: translateY(0px)    scaleX(1.06) scaleY(0.94); }
        }
        /* ── Elementos: flotación suave y orgánica ── */
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(-4deg); }
          50%       { transform: translateY(-22px) rotate(6deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(8deg); }
          50%       { transform: translateY(-30px) rotate(-6deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-18px) rotate(14deg); }
        }
        @keyframes floatD {
          0%, 100% { transform: translateY(0px) scale(1) rotate(3deg); }
          50%       { transform: translateY(-25px) scale(1.08) rotate(-3deg); }
        }
        .auth-jump { animation: bookiJump 1.9s cubic-bezier(0.28, 0, 0.72, 1) infinite; }
        .auth-fA   { animation: floatA 3.4s ease-in-out infinite; }
        .auth-fB   { animation: floatB 4.1s ease-in-out infinite; }
        .auth-fC   { animation: floatC 2.8s ease-in-out infinite; }
        .auth-fD   { animation: floatD 3.7s ease-in-out infinite; }

        /* ── Strip Clerk card chrome ── */
        .cl-card, .cl-cardBox {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .cl-header { display: none !important; }
        .cl-footer { display: none !important; }

        /* ── Ilustración: oculta mobile, visible desktop ── */
        .auth-illustration { display: none; }
        @media (min-width: 768px) {
          .auth-illustration { display: block; }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, display: "flex", flexDirection: "row",
        background: "radial-gradient(1100px 560px at 78% -8%, #f1ecff, transparent), radial-gradient(900px 520px at -5% 105%, #e9f0ff, transparent), #eef0fb",
        overflow: "hidden",
      }}>

        {/* ── IZQUIERDA — ILUSTRACIÓN ── */}
        <div className="auth-illustration" style={{ flex: 1, position: "relative", overflow: "hidden" }}>

          {/* Booki — grande, centrado, saltando */}
          <div className="auth-jump" style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 2, width: "55%", maxWidth: 480,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/booki%20inicio%20de%20sesion.png"
              alt="Booki saltando"
              style={{ width: "100%", height: "auto" }}
            />
          </div>

          {/* ── ARGOLLAS ── */}
          <div className="auth-fA" style={{ position: "absolute", top: "7%", left: "6%", width: "16%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/argolla%20login.png" alt="" style={{ width: "100%", height: "auto" }} />
          </div>
          <div className="auth-fC" style={{ position: "absolute", top: "28%", right: "4%", width: "11%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/argolla%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.82 }} />
          </div>
          <div className="auth-fB" style={{ position: "absolute", bottom: "15%", left: "4%", width: "13%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/argolla%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.72 }} />
          </div>
          <div className="auth-fD" style={{ position: "absolute", bottom: "8%", right: "14%", width: "8%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/argolla%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.65 }} />
          </div>

          {/* ── CUBOS ── */}
          <div className="auth-fB" style={{ position: "absolute", top: "6%", right: "10%", width: "13%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cubo%20login.png" alt="" style={{ width: "100%", height: "auto" }} />
          </div>
          <div className="auth-fC" style={{ position: "absolute", top: "48%", left: "3%", width: "9%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cubo%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.85 }} />
          </div>
          <div className="auth-fA" style={{ position: "absolute", bottom: "6%", left: "34%", width: "7%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cubo%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.7 }} />
          </div>

          {/* ── BOLAS ── */}
          <div className="auth-fD" style={{ position: "absolute", top: "20%", left: "18%", width: "10%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bola%20login.png" alt="" style={{ width: "100%", height: "auto" }} />
          </div>
          <div className="auth-fA" style={{ position: "absolute", top: "62%", right: "5%", width: "7%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bola%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.78 }} />
          </div>
          <div className="auth-fC" style={{ position: "absolute", bottom: "12%", left: "24%", width: "6%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bola%20login.png" alt="" style={{ width: "100%", height: "auto", opacity: 0.62 }} />
          </div>

        </div>

        {/* ── DERECHA — FORM ── */}
        <div style={{
          flex: "0 0 auto",
          width: "min(460px, 100%)",
          display: "flex", flexDirection: "column",
          padding: "32px 48px",
          overflowY: "auto",
          position: "relative", zIndex: 2,
        }}>
          <div style={{
            fontFamily: "var(--po)", fontWeight: 700, fontSize: 11,
            letterSpacing: "0.14em", color: "#8487a6", textTransform: "uppercase",
            marginBottom: "auto",
          }}>
            {step}
          </div>

          <div style={{ paddingTop: 40, paddingBottom: 40 }}>
            <h1 style={{
              fontFamily: "var(--po)", fontWeight: 800,
              fontSize: "clamp(32px, 3.5vw, 44px)", letterSpacing: "-0.03em",
              lineHeight: 1.05, color: "#1f2347", marginBottom: 10,
            }}>
              {title}
            </h1>
            <p style={{ fontSize: 14, color: "#8487a6", marginBottom: 32, maxWidth: 320, lineHeight: 1.55 }}>
              {lead}
            </p>

            {children}

            {footerLink && (
              <div style={{
                marginTop: 28, paddingTop: 20,
                borderTop: "1px solid #eef0f6",
                fontSize: 12.5, color: "#8487a6",
              }}>
                {footerLink}
              </div>
            )}
          </div>

          <div style={{ marginTop: "auto", fontSize: 11, color: "#aab2c8", letterSpacing: "0.08em", textAlign: "right" }}>
            © Skillio 2026
          </div>
        </div>

      </div>
    </>
  );
}
