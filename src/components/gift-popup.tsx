"use client";

import { useState } from "react";
import Image from "next/image";

type GiftType = "techniques" | "resumen_pdf" | "bonus_gen" | "discount";

export function GiftPopup({
  type,
  noteId,
  eyebrow = "🎁 UN REGALO PARA VOS",
  title,
  subtitle,
  ctaText = "Quiero mi regalo",
  successText = "¡Listo! Revisá tu correo 📬",
  onClose,
  onSuccess,
}: {
  type: GiftType;
  noteId?: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  ctaText?: string;
  successText?: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr("Poné un mail válido 🙂"); return; }
    setErr("");
    setState("loading");
    try {
      const r = await fetch("/api/public/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, email: e, note_id: noteId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d?.error === "invalid_email" ? "Ese mail no es válido." : "No se pudo enviar. Probá de nuevo.");
        setState("error");
        return;
      }
      setState("done");
      onSuccess?.();
    } catch {
      setErr("Error de red. Probá de nuevo.");
      setState("error");
    }
  }

  return (
    <div
      onClick={(ev) => { if (ev.target === ev.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(20,16,44,.55)", backdropFilter: "blur(5px)", display: "grid", placeItems: "center", padding: 18 }}
    >
      <div style={{ position: "relative", width: "min(420px,100%)", background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 30px 80px rgba(30,20,80,.4)", animation: "giftIn .32s cubic-bezier(.34,1.56,.64,1)" }}>
        <style>{`@keyframes giftIn{from{opacity:0;transform:translateY(24px) scale(.94)}to{opacity:1;transform:none}}`}</style>

        {/* header regalo con moño */}
        <div style={{ position: "relative", background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", padding: "26px 24px 46px", textAlign: "center", overflow: "hidden" }}>
          <span style={{ position: "absolute", top: -30, right: -20, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,.14)" }} />
          <span style={{ position: "absolute", bottom: -40, left: -24, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,.1)" }} />
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,.2)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", borderRadius: 999, padding: "5px 13px", fontSize: 11.5, fontWeight: 800, letterSpacing: ".06em", position: "relative" }}>
            {eyebrow}
          </div>
          <div style={{ marginTop: 6 }}>
            <Image src="/booki-3.png" alt="Booki" width={92} height={92} style={{ width: 92, height: 92, objectFit: "contain", filter: "drop-shadow(0 8px 18px rgba(0,0,0,.28))" }} />
          </div>
        </div>

        {/* botón cerrar */}
        <button onClick={onClose} aria-label="Cerrar" style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 10, border: "none", background: "rgba(255,255,255,.22)", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>

        <div style={{ padding: "0 24px 26px", marginTop: -26, position: "relative" }}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 8px 30px rgba(30,20,80,.12)", padding: "22px 20px", textAlign: "center" }}>
            {state === "done" ? (
              <div style={{ padding: "10px 0" }}>
                <div style={{ fontSize: 44 }}>📬</div>
                <div style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 19, color: "var(--ink,#1f2347)", margin: "8px 0 6px" }}>{successText}</div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.55, marginBottom: 16 }}>Te lo mandamos a <b>{email}</b>. Si no lo ves, revisá spam/promociones.</div>
                <button onClick={onClose} style={{ width: "100%", padding: 13, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Listo</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 21, lineHeight: 1.25, color: "var(--ink,#1f2347)", margin: "0 0 8px" }}>{title}</h2>
                {subtitle && <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>{subtitle}</div>}
                <input
                  type="email"
                  inputMode="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                  style={{ width: "100%", padding: "13px 15px", borderRadius: 13, border: "1.5px solid #e3def2", fontSize: 15, outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                />
                {err && <div style={{ color: "#c0392b", fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
                <button
                  onClick={submit}
                  disabled={state === "loading"}
                  style={{ width: "100%", padding: 14, border: "none", borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff", fontFamily: "var(--po)", fontWeight: 800, fontSize: 15.5, cursor: state === "loading" ? "default" : "pointer", opacity: state === "loading" ? 0.7 : 1, boxShadow: "0 8px 22px rgba(99,60,220,.3)" }}
                >
                  {state === "loading" ? "Enviando…" : `🎁 ${ctaText}`}
                </button>
                <div style={{ fontSize: 11, color: "var(--faint,#9a90b8)", marginTop: 10 }}>Sin spam. Podés darte de baja cuando quieras.</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
