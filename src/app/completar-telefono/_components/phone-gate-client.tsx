"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SkillioMark } from "@/app/_components/landing/landing-top";

// Red de seguridad server-side (ver app/layout.tsx): a cualquier usuario pago
// sin teléfono lo mandamos acá antes de dejarlo entrar a /app. Complementa el
// paso de teléfono de /pago-exitoso, que es "best effort" del lado del cliente
// y se puede saltear (timeout, cerrar la pestaña, volver atrás). Este gate no.
export function PhoneGateClient({ next }: { next: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function savePhone() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      setErr("Ingresá un teléfono válido.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/me/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        setErr("No pudimos guardar el teléfono. Probá de nuevo.");
        setBusy(false);
        return;
      }
    } catch {
      setErr("Algo salió mal. Probá de nuevo.");
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center gap-6 px-6 text-center">
      <SkillioMark size={30} />
      <div style={{ width: "min(380px, 100%)" }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>📱</div>
        <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em] text-ink mb-2">
          Última cosa
        </h1>
        <p className="text-sm text-ink-soft mb-5">
          Dejanos tu teléfono para poder contactarte si lo necesitás. Es obligatorio para seguir.
        </p>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="11 2345 6789"
          value={phone}
          disabled={busy}
          onChange={(e) => {
            setPhone(e.target.value);
            if (err) setErr("");
          }}
          onKeyDown={(e) => e.key === "Enter" && savePhone()}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px 15px",
            fontSize: 15,
            borderRadius: 13,
            border: `1.5px solid ${err ? "#ff5b71" : "rgba(139,92,246,.28)"}`,
            outline: "none",
            marginBottom: err ? 8 : 14,
          }}
        />
        {err && (
          <div style={{ fontSize: 13, color: "#d63a52", fontWeight: 600, marginBottom: 14, textAlign: "left" }}>
            {err}
          </div>
        )}
        <button
          onClick={savePhone}
          disabled={busy}
          style={{
            width: "100%",
            padding: "15px",
            border: "none",
            borderRadius: 14,
            background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
            color: "#fff",
            fontFamily: "var(--po)",
            fontWeight: 700,
            fontSize: 15.5,
            cursor: busy ? "default" : "pointer",
            boxShadow: "0 8px 22px rgba(124,58,237,.28)",
            opacity: busy ? 0.75 : 1,
          }}
        >
          {busy ? "Guardando…" : "Guardar y entrar →"}
        </button>
      </div>
    </div>
  );
}
