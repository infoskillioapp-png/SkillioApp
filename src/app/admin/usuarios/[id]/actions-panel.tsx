"use client";

import { useState, useTransition } from "react";
import { adminGrantCredits, adminSetPlan, adminResetFreeGenerations, type AdminPlan } from "@/lib/admin/actions";

const C = {
  ink: "#1f2347", muted: "#8487a6", card: "#ffffff", line: "#eef0f6",
  violet: "#8b5cf6", blue: "#4f7dff", green: "#10b981",
  po: '"Poppins",system-ui,sans-serif',
};

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
      try {
        await fn();
        setMsg(ok);
      } catch {
        setMsg("Error al aplicar la acción");
      }
    });
  }

  return (
    <div
      className="rounded-2xl p-5 h-fit"
      style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: "0 2px 4px rgba(40,44,90,.04), 0 10px 22px rgba(72,56,142,.08)" }}
    >
      <h2 className="text-[15px] mb-4" style={{ fontFamily: C.po, fontWeight: 700 }}>Acciones</h2>

      <div className="flex items-center gap-2 mb-4">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 px-3 py-2 rounded-xl text-sm focus:outline-none"
          style={{ border: `1px solid ${C.line}` }}
        />
        <button
          disabled={pending}
          onClick={() => run(() => adminGrantCredits(userId, Number(amount) || 0), "Créditos actualizados")}
          className="px-4 py-2 rounded-full text-white text-[13px] font-semibold transition disabled:opacity-50"
          style={{ background: `linear-gradient(135deg,${C.violet},${C.blue})` }}
        >
          Sumar créditos
        </button>
      </div>

      <div className="text-[11px] uppercase font-semibold mb-2" style={{ letterSpacing: "0.1em", color: C.muted }}>
        Cambiar plan
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {PLAN_OPTIONS.map((p) => (
          <button
            key={p.value}
            disabled={pending || plan === p.value}
            onClick={() => run(() => adminSetPlan(userId, p.value), `Plan cambiado a ${p.label}`)}
            className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition disabled:opacity-40"
            style={
              plan === p.value
                ? { background: `linear-gradient(135deg,${C.violet},${C.blue})`, color: "#fff" }
                : { border: `1px solid ${C.line}`, color: C.ink }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        disabled={pending}
        onClick={() => run(() => adminResetFreeGenerations(userId), "Generaciones gratis reiniciadas")}
        className="w-full px-4 py-2 rounded-full text-[13px] font-semibold transition disabled:opacity-50"
        style={{ border: `1px solid ${C.line}`, color: C.ink }}
      >
        Reiniciar 3 generaciones gratis
      </button>

      {msg && <div className="mt-3 text-[12.5px] font-semibold" style={{ color: C.green }}>{msg}</div>}
    </div>
  );
}
