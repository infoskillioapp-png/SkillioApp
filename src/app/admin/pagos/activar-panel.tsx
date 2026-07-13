"use client";

import { useState, useTransition } from "react";
import {
  adminLookupMpSubscription,
  adminActivateFromMp,
  type MpLookupResult,
  type MpActivateResult,
} from "@/lib/admin/actions";

export function ActivarPorMercadoPago() {
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<MpLookupResult | null>(null);
  const [result, setResult] = useState<MpActivateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setLookup(null);
    setResult(null);
    setErr(null);
  }

  function search() {
    reset();
    startTransition(async () => {
      try {
        const r = await adminLookupMpSubscription(email);
        setLookup(r);
        if (!r.found) setErr("No encontramos ninguna suscripción con ese mail en MercadoPago.");
      } catch {
        setErr("Error buscando en MercadoPago. Probá de nuevo.");
      }
    });
  }

  function confirm() {
    if (!lookup?.found) return;
    startTransition(async () => {
      try {
        const r = await adminActivateFromMp(email, lookup.preapprovalId);
        setResult(r);
        if (!r.ok) setErr(r.error ?? "No se pudo activar.");
      } catch {
        setErr("Error al activar. Probá de nuevo.");
      }
    });
  }

  return (
    <div className="panel" style={{ marginBottom: 22 }}>
      <h2 className="panel__title" style={{ marginBottom: 6 }}>Activar por mail de MercadoPago</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 14 }}>
        Pegá el mail con el que la persona pagó en MercadoPago (el que figura como &quot;Cliente&quot; en el pago).
        Sirve tanto si ya tiene cuenta como si no.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            reset();
          }}
          onKeyDown={(e) => e.key === "Enter" && email && !pending && search()}
          placeholder="mail@ejemplo.com"
          className="range__date"
          style={{ flex: 1, minWidth: 220 }}
        />
        <button disabled={pending || !email} onClick={search} className="btn-solid">
          Buscar en MercadoPago
        </button>
      </div>

      {err && (
        <p style={{ color: "#d63a52", fontWeight: 600, fontSize: 13.5, marginBottom: 10 }}>{err}</p>
      )}

      {lookup?.found && !result && (
        <div
          style={{
            border: "1.5px solid rgba(139,92,246,.25)",
            borderRadius: 12,
            padding: 16,
            marginBottom: 4,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Encontramos esto:</div>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <div>
              Plan: <b>{lookup.planLabel}</b> — ${lookup.amount.toLocaleString("es-AR")}
            </div>
            <div>
              Estado en MercadoPago:{" "}
              <b>{lookup.status === "authorized" ? "✅ Autorizada" : lookup.status}</b>
            </div>
            <div>Pagó: {new Date(lookup.dateCreated).toLocaleString("es-AR")}</div>
            <div>Mail: {lookup.payerEmail}</div>
          </div>
          <button disabled={pending} onClick={confirm} className="btn-solid" style={{ marginTop: 12 }}>
            {pending ? "Activando…" : "Confirmar y activar"}
          </button>
        </div>
      )}

      {result?.ok && (
        <div
          style={{
            border: "1.5px solid rgba(52,211,153,.35)",
            borderRadius: 12,
            padding: 16,
            background: "rgba(52,211,153,.06)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>✅ Listo</div>
          <div style={{ fontSize: 14, lineHeight: 1.8 }}>
            <div>
              {result.email} quedó en plan <b>{result.plan}</b>
              {result.accountCreated ? " (cuenta nueva creada)" : ""}.
            </div>
            <div>Pago registrado: {result.paymentRecorded ? "✅" : "⚠️ no se pudo"}</div>
            <div>Meta avisado: {result.metaSent ? "✅" : "⚠️ no se pudo"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
