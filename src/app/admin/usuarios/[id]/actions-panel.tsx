"use client";

import { useState, useTransition } from "react";
import { adminGrantCredits, adminSetPlan, adminResetFreeGenerations, type AdminPlan } from "@/lib/admin/actions";

const PLAN_OPTIONS: { value: AdminPlan; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "semanal", label: "Semanal" },
  { value: "pro", label: "Mensual" },
  { value: "trimestral", label: "Trimestral" },
];

export function ActionsPanel({ userId, plan }: { userId: string; plan: AdminPlan }) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("100");
  const [msg, setMsg] = useState<string | null>(null);

  function run(fn: () => Promise<void>, ok: string) {
    setMsg(null);
    startTransition(async () => {
      try { await fn(); setMsg(ok); } catch { setMsg("Error al aplicar la acción"); }
    });
  }

  return (
    <section className="panel" style={{ alignSelf: "start" }}>
      <h2 className="panel__title" style={{ marginBottom: 18 }}>Acciones</h2>

      <div className="adm__eyebrow" style={{ marginTop: 0 }}>Créditos</div>
      <div style={{ display: "flex", gap: 8, margin: "12px 0 22px" }}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="range__date"
          style={{ width: 90 }}
        />
        <button
          disabled={pending}
          onClick={() => run(() => adminGrantCredits(userId, Number(amount) || 0), "Créditos actualizados")}
          className="btn-solid"
          style={{ flex: 1 }}
        >
          Sumar créditos
        </button>
      </div>

      <div className="adm__eyebrow" style={{ marginTop: 0 }}>Cambiar plan</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0 22px" }}>
        {PLAN_OPTIONS.map((p) => (
          <button
            key={p.value}
            disabled={pending || plan === p.value}
            onClick={() => run(() => adminSetPlan(userId, p.value), `Plan cambiado a ${p.label}`)}
            className={plan === p.value ? "btn-solid" : "btn-line"}
            style={{ padding: "8px 14px" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        disabled={pending}
        onClick={() => run(() => adminResetFreeGenerations(userId), "Generaciones gratis reiniciadas")}
        className="btn-line"
        style={{ width: "100%", justifyContent: "center" }}
      >
        Reiniciar 3 generaciones gratis
      </button>

      {msg && <p style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: "var(--green)" }}>{msg}</p>}
    </section>
  );
}
