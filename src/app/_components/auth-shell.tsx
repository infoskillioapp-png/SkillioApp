import type { ReactNode } from "react";
import Image from "next/image";

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
        @keyframes bookiBounce {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-14px) rotate(6deg); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-20px) rotate(-8deg); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(-10px) rotate(12deg); }
        }
        @keyframes floatD {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-16px) scale(1.06); }
        }
        .auth-bounce { animation: bookiBounce 2.4s ease-in-out infinite; }
        .auth-floatA { animation: floatA 3.1s ease-in-out infinite; }
        .auth-floatB { animation: floatB 3.8s ease-in-out infinite; }
        .auth-floatC { animation: floatC 2.7s ease-in-out infinite; }
        .auth-floatD { animation: floatD 4.2s ease-in-out infinite; }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, display: "flex",
        background: "radial-gradient(1100px 560px at 78% -8%, #f1ecff, transparent), radial-gradient(900px 520px at -5% 105%, #e9f0ff, transparent), #eef0fb",
        overflow: "hidden",
      }}>

        {/* ── PANEL IZQUIERDO — FORM ── */}
        <div style={{
          flex: "0 0 auto", width: "min(480px, 100%)",
          display: "flex", flexDirection: "column",
          padding: "32px 48px", overflowY: "auto", position: "relative", zIndex: 2,
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
              fontSize: "clamp(34px, 4vw, 46px)", letterSpacing: "-0.03em",
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

        {/* ── PANEL DERECHO — ILUSTRACIÓN (solo desktop) ── */}
        <div style={{
          flex: 1, position: "relative", overflow: "hidden",
          display: "none",
        }} className="md:block">

          {/* Booki central — bouncing */}
          <div className="auth-bounce" style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -54%)",
            zIndex: 2,
          }}>
            <Image
              src="/booki%20con%20libros%20login.png"
              alt="Booki"
              width={320} height={360}
              style={{ width: 320, height: "auto", filter: "drop-shadow(0 24px 40px rgba(100,50,200,.22))" }}
              priority
            />
          </div>

          {/* Argolla grande — arriba izquierda */}
          <div className="auth-floatA" style={{ position: "absolute", top: "10%", left: "8%", width: 110 }}>
            <Image src="/argolla%20login.png" alt="" width={110} height={110} style={{ width: 110, height: "auto" }} />
          </div>

          {/* Argolla pequeña — abajo derecha */}
          <div className="auth-floatC" style={{ position: "absolute", bottom: "14%", right: "10%", width: 64 }}>
            <Image src="/argolla%20login.png" alt="" width={64} height={64} style={{ width: 64, height: "auto", opacity: 0.85 }} />
          </div>

          {/* Argolla mediana — abajo izquierda */}
          <div className="auth-floatB" style={{ position: "absolute", bottom: "22%", left: "5%", width: 80 }}>
            <Image src="/argolla%20login.png" alt="" width={80} height={80} style={{ width: 80, height: "auto", opacity: 0.7 }} />
          </div>

          {/* Cubo grande — arriba derecha */}
          <div className="auth-floatB" style={{ position: "absolute", top: "8%", right: "12%", width: 90 }}>
            <Image src="/cubo%20login.png" alt="" width={90} height={90} style={{ width: 90, height: "auto" }} />
          </div>

          {/* Cubo mediano — izquierda media */}
          <div className="auth-floatC" style={{ position: "absolute", top: "45%", left: "4%", width: 64 }}>
            <Image src="/cubo%20login.png" alt="" width={64} height={64} style={{ width: 64, height: "auto", opacity: 0.9 }} />
          </div>

          {/* Cubo pequeño — abajo centro */}
          <div className="auth-floatA" style={{ position: "absolute", bottom: "8%", left: "38%", width: 46 }}>
            <Image src="/cubo%20login.png" alt="" width={46} height={46} style={{ width: 46, height: "auto", opacity: 0.75 }} />
          </div>

          {/* Bola grande — arriba centro-izquierda */}
          <div className="auth-floatD" style={{ position: "absolute", top: "18%", left: "22%", width: 72 }}>
            <Image src="/bola%20login.png" alt="" width={72} height={72} style={{ width: 72, height: "auto" }} />
          </div>

          {/* Bola pequeña — derecha media */}
          <div className="auth-floatA" style={{ position: "absolute", top: "55%", right: "6%", width: 48 }}>
            <Image src="/bola%20login.png" alt="" width={48} height={48} style={{ width: 48, height: "auto", opacity: 0.8 }} />
          </div>

          {/* Bola mini — abajo izquierda */}
          <div className="auth-floatC" style={{ position: "absolute", bottom: "10%", left: "28%", width: 36 }}>
            <Image src="/bola%20login.png" alt="" width={36} height={36} style={{ width: 36, height: "auto", opacity: 0.65 }} />
          </div>

        </div>
      </div>
    </>
  );
}
