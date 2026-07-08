import type { ReactNode } from "react";
import { InAppBrowserBanner } from "./in-app-browser-banner";

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
        /* Strip Clerk card chrome */
        .cl-card, .cl-cardBox {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .cl-header { display: none !important; }
        .cl-footer { display: none !important; }

        /* Ilustración: oculta en mobile, visible en desktop */
        .auth-illustration { display: none; }
        @media (min-width: 768px) {
          .auth-illustration { display: block; }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, display: "flex", flexDirection: "row",
        background: "#eef0fb",
        overflow: "hidden",
      }}>

        {/* ── IZQUIERDA — VIDEO BOOKI ── */}
        <div className="auth-illustration" style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src="/booki-animado.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
              position: "absolute",
              inset: 0,
            }}
          />
        </div>

        {/* ── DERECHA — FORM ── */}
        <div style={{
          flex: "0 0 auto",
          width: "min(460px, 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "32px 48px",
          overflowY: "auto",
          position: "relative",
          zIndex: 2,
          background: "#eef0fb",
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

            <InAppBrowserBanner />
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
