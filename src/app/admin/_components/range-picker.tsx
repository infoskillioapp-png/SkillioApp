"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const C = { ink: "#1f2347", muted: "#8487a6", line: "#eef0f6", violet: "#8b5cf6", blue: "#4f7dff" };

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Selector de rango de fechas para el dashboard. Escribe ?from=&to= en la URL;
// el server component re-renderiza con la ventana elegida.
export function RangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply(nextFrom: string, nextTo: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("from", nextFrom);
    sp.set("to", nextTo);
    router.push(`/admin?${sp.toString()}`);
  }

  function preset(days: number | "all") {
    const today = new Date();
    const nf = days === "all" ? "2026-06-01" : iso(new Date(today.getTime() - (days - 1) * 86400000));
    const nt = iso(today);
    setF(nf);
    setT(nt);
    apply(nf, nt);
  }

  // ¿Qué preset está activo? (para resaltar)
  const today = iso(new Date());
  const activeDays =
    t === today
      ? (Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86400000) + 1)
      : -1;

  const presets: { label: string; days: number | "all" }[] = [
    { label: "7 días", days: 7 },
    { label: "30 días", days: 30 },
    { label: "90 días", days: 90 },
    { label: "Todo", days: "all" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {presets.map((p) => {
          const active = p.days !== "all" && activeDays === p.days;
          return (
            <button
              key={p.label}
              onClick={() => preset(p.days)}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-semibold transition"
              style={
                active
                  ? { background: `linear-gradient(135deg,${C.violet},${C.blue})`, color: "#fff" }
                  : { border: `1px solid ${C.line}`, color: C.muted, background: "#fff" }
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 ml-1">
        <input
          type="date"
          value={f}
          max={t}
          onChange={(e) => setF(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
          style={{ border: `1px solid ${C.line}`, color: C.ink, background: "#fff" }}
        />
        <span style={{ color: C.muted }}>→</span>
        <input
          type="date"
          value={t}
          min={f}
          max={today}
          onChange={(e) => setT(e.target.value)}
          className="px-2.5 py-1.5 rounded-lg text-[12.5px] focus:outline-none"
          style={{ border: `1px solid ${C.line}`, color: C.ink, background: "#fff" }}
        />
        <button
          onClick={() => apply(f, t)}
          className="px-3.5 py-1.5 rounded-lg text-white text-[12.5px] font-semibold"
          style={{ background: `linear-gradient(135deg,${C.violet},${C.blue})` }}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
