"use client";

import { useState, useTransition } from "react";
import { adminGrantCredits, adminSetPlan, adminResetFreeGenerations } from "@/lib/admin/actions";

export function ActionsPanel({
  userId,
  plan,
}: {
  userId: string;
  plan: "free" | "pro";
}) {
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
    <div className="rounded-2xl border border-rule-soft bg-paper p-5">
      <h2 className="font-display font-bold text-[15px] mb-4">Acciones</h2>

      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24 px-3 py-2 rounded-xl border border-rule bg-paper text-sm focus:outline-none focus:border-accent"
        />
        <button
          disabled={pending}
          onClick={() => run(() => adminGrantCredits(userId, Number(amount) || 0), "Créditos actualizados")}
          className="px-4 py-2 rounded-full bg-accent text-[#FBF1EF] text-[13px] font-semibold hover:bg-accent-hover transition disabled:opacity-50"
        >
          Sumar créditos
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {plan === "free" ? (
          <button
            disabled={pending}
            onClick={() => run(() => adminSetPlan(userId, "pro"), "Pasado a PRO")}
            className="px-4 py-2 rounded-full border border-rule text-[13px] font-semibold hover:border-accent hover:text-accent transition disabled:opacity-50"
          >
            Marcar PRO
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() => run(() => adminSetPlan(userId, "free"), "Pasado a Free")}
            className="px-4 py-2 rounded-full border border-rule text-[13px] font-semibold hover:border-accent hover:text-accent transition disabled:opacity-50"
          >
            Pasar a Free
          </button>
        )}
        <button
          disabled={pending}
          onClick={() => run(() => adminResetFreeGenerations(userId), "Generaciones gratis reiniciadas")}
          className="px-4 py-2 rounded-full border border-rule text-[13px] font-semibold hover:border-accent hover:text-accent transition disabled:opacity-50"
        >
          Reiniciar 3 gratis
        </button>
      </div>

      {msg && <div className="mt-3 text-[12.5px] text-success font-semibold">{msg}</div>}
    </div>
  );
}
