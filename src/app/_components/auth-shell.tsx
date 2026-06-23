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
    <div style={{ position: "fixed", inset: 0, display: "grid", gridTemplateColumns: "1fr", background: "#eef0fb", overflow: "hidden" }}
      className="md:grid-cols-[1.05fr_1fr]">

      {/* HERO IZQUIERDO */}
      <aside style={{
        position: "relative", display: "none", flexDirection: "column",
        overflow: "hidden", background: "#9655E5", color: "#FBF1EF",
        padding: "40px 56px",
      }} className="md:flex">
        {/* Anillos decorativos */}
        <span aria-hidden style={{
          pointerEvents: "none", position: "absolute",
          right: -120, bottom: -120, width: 360, height: 360,
          borderRadius: "50%", border: "1px solid rgba(251,241,239,.22)",
        }} />
        <span aria-hidden style={{
          pointerEvents: "none", position: "absolute",
          right: -220, bottom: -220, width: 560, height: 560,
          borderRadius: "50%", border: "1px solid rgba(251,241,239,.13)",
        }} />
        {/* Gradiente sutil */}
        <span aria-hidden style={{
          pointerEvents: "none", position: "absolute",
          inset: 0, background: "radial-gradient(ellipse at 20% 20%, rgba(255,255,255,.12), transparent 60%)",
        }} />

        <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.75, position: "relative" }}>
          Skillio &nbsp;/&nbsp; La app del estudiante
        </div>

        <div style={{ marginTop: "auto", position: "relative" }}>
          <div style={{
            fontFamily: "var(--po)", fontWeight: 800,
            fontSize: "clamp(72px, 9vw, 112px)", lineHeight: 0.92,
            letterSpacing: "-0.04em",
          }}>
            Skill<br />io.
          </div>
          <p style={{
            marginTop: 24, maxWidth: 460,
            fontFamily: "var(--po)", fontStyle: "italic", fontWeight: 500,
            fontSize: "clamp(18px, 1.5vw, 22px)", lineHeight: 1.3, letterSpacing: "-0.01em",
            opacity: 0.9,
          }}>
            &ldquo;El estudio constante no es ruido, es ritmo. Skillio te ayuda a encontrarlo.&rdquo;
          </p>
        </div>
      </aside>

      {/* PANEL DERECHO — FORM */}
      <main style={{
        position: "relative", display: "flex", flexDirection: "column",
        padding: "32px 32px", overflowY: "auto",
      }} className="sm:px-14 sm:py-10">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "auto" }}>
          <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 11, letterSpacing: "0.12em", color: "#8487a6", textTransform: "uppercase" }}>
            {step}
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 420, margin: "auto 0" }}>
          <h1 style={{
            fontFamily: "var(--po)", fontWeight: 800,
            fontSize: "clamp(32px, 4vw, 44px)", letterSpacing: "-0.03em", lineHeight: 1.05,
            color: "#1f2347", marginBottom: 8,
          }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: "#8487a6", marginBottom: 32, maxWidth: 340 }}>{lead}</p>

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

        <div style={{
          marginTop: "auto", paddingTop: 28,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 11, color: "#8487a6", letterSpacing: "0.08em",
        }}>
          <span />
          <span>© Skillio 2026</span>
        </div>
      </main>
    </div>
  );
}
