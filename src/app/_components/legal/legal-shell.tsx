import Link from "next/link";
import type { ReactNode } from "react";

const C = {
  bg: "#fbf1ef",
  paper: "#ffffff",
  paperWarm: "#fdf7f5",
  ink: "#353831",
  inkSoft: "#6b6b65",
  inkSofter: "#9a9a92",
  accent: "#a5402d",
  rule: "rgba(53,56,49,0.10)",
};

export function LegalShell({
  title,
  subtitle,
  updatedAt,
  children,
}: {
  title: string;
  subtitle: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        background: C.bg,
        color: C.ink,
        minHeight: "100vh",
        fontFamily: "var(--font-jakarta), system-ui, sans-serif",
        colorScheme: "light",
      }}
    >
      {/* Topbar */}
      <header
        style={{
          borderBottom: `1px solid ${C.rule}`,
          background: "rgba(251,241,239,0.85)",
          backdropFilter: "blur(8px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 820,
            margin: "0 auto",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: C.ink,
              fontFamily: "var(--font-serif), Georgia, serif",
              fontSize: 22,
              letterSpacing: "-0.02em",
            }}
          >
            skillio<span style={{ color: C.accent }}>.</span>
          </Link>
          <Link
            href="/"
            style={{
              fontSize: 14,
              color: C.inkSoft,
              textDecoration: "none",
            }}
          >
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* Contenido */}
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 80px" }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: C.accent,
            margin: "0 0 12px",
          }}
        >
          Legal
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif), Georgia, serif",
            fontSize: 44,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            margin: "0 0 14px",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 17, color: C.inkSoft, lineHeight: 1.55, margin: "0 0 8px", maxWidth: 620 }}>
          {subtitle}
        </p>
        <p style={{ fontSize: 13, color: C.inkSofter, margin: "0 0 40px" }}>
          Última actualización: {updatedAt}
        </p>

        <article
          style={{
            background: C.paper,
            border: `1px solid ${C.rule}`,
            borderRadius: 20,
            padding: "36px clamp(20px, 5vw, 44px)",
          }}
          className="legal-prose"
        >
          {children}
        </article>

        <p style={{ marginTop: 28, fontSize: 13, color: C.inkSofter, textAlign: "center" }}>
          ¿Dudas sobre este documento? Escribinos a{" "}
          <a href="mailto:info.skillioapp@gmail.com" style={{ color: C.accent }}>
            info.skillioapp@gmail.com
          </a>
        </p>
      </main>

      {/* Estilos de prosa legal */}
      <style>{`
        .legal-prose { font-size: 15.5px; line-height: 1.72; color: ${C.ink}; }
        .legal-prose h2 {
          font-family: var(--font-serif), Georgia, serif;
          font-size: 24px;
          letter-spacing: -0.02em;
          margin: 36px 0 12px;
          line-height: 1.2;
          scroll-margin-top: 80px;
        }
        .legal-prose h2:first-child { margin-top: 0; }
        .legal-prose h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 24px 0 8px;
        }
        .legal-prose p { margin: 0 0 14px; color: ${C.inkSoft}; }
        .legal-prose strong { color: ${C.ink}; font-weight: 600; }
        .legal-prose ul { margin: 0 0 16px; padding-left: 22px; color: ${C.inkSoft}; }
        .legal-prose li { margin-bottom: 8px; }
        .legal-prose a { color: ${C.accent}; }
        .legal-prose .lead-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 999px;
          background: ${C.accent}; color: #fff; font-size: 13px; font-weight: 700;
          margin-right: 10px; flex-shrink: 0;
        }
        .legal-prose .callout {
          background: ${C.paperWarm};
          border: 1px solid ${C.rule};
          border-left: 3px solid ${C.accent};
          border-radius: 12px;
          padding: 16px 18px;
          margin: 0 0 18px;
          font-size: 14.5px;
        }
        .legal-prose .callout p:last-child { margin-bottom: 0; }
        .legal-prose .meta-box {
          background: ${C.paperWarm};
          border: 1px solid ${C.rule};
          border-radius: 12px;
          padding: 18px 20px;
          margin: 0 0 18px;
          font-size: 14.5px;
        }
        .legal-prose .meta-box div { margin-bottom: 4px; color: ${C.inkSoft}; }
        .legal-prose .meta-box div strong { color: ${C.ink}; }
      `}</style>
    </div>
  );
}
