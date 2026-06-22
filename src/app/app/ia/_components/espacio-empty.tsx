"use client";

import Image from "next/image";
import { useState } from "react";
import { UploadModal } from "../../_components/upload-modal";

export function EspacioEmpty() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{
        minHeight: "calc(100vh - 40px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
        textAlign: "center",
        gap: 0,
      }}>
        <Image src="/bookisubirarchivocorrecto.png" alt="Booki" width={180} height={180}
          style={{ filter: "drop-shadow(0 14px 28px rgba(99,60,220,.28))", animation: "bookiFloat 4s ease-in-out infinite" }} />
        <h2 className="po" style={{ fontSize: 28, fontWeight: 800, marginTop: 24, marginBottom: 10, color: "var(--ink)" }}>
          Todavía no tenés apuntes
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 15, maxWidth: 38 + "ch", lineHeight: 1.65, margin: "0 auto 28px" }}>
          Subí tu primer apunte y Booki te arma el resumen, las tarjetas y el simulacro en segundos.
        </p>
        <button
          onClick={() => setOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg,var(--blue),var(--violet))",
            color: "#fff", border: "none", borderRadius: 16,
            padding: "14px 28px", fontFamily: "var(--po)",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
            boxShadow: "0 12px 28px rgba(99,102,241,.35)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
          </svg>
          Subir mi primer apunte
        </button>
      </div>
      <UploadModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
