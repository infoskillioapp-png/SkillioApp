"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

// Selector de rango de fechas. Escribe ?from=&to= en la sección actual; el
// server component re-renderiza con la ventana elegida.
export function RangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  function apply(nf: string, nt: string) {
    router.push(`${pathname}?from=${nf}&to=${nt}`);
  }
  function preset(days: number | "all") {
    const today = new Date();
    const nf = days === "all" ? "2026-06-01" : iso(new Date(today.getTime() - (days - 1) * 86400000));
    const nt = iso(today);
    setF(nf); setT(nt); apply(nf, nt);
  }

  const today = iso(new Date());
  const span = t === today ? Math.round((new Date(t).getTime() - new Date(f).getTime()) / 86400000) + 1 : -1;
  const presets: { label: string; days: number | "all" }[] = [
    { label: "Hoy", days: 1 }, { label: "7d", days: 7 }, { label: "30d", days: 30 }, { label: "90d", days: 90 }, { label: "Todo", days: "all" },
  ];

  return (
    <div className="range">
      <div className="range__presets">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => preset(p.days)}
            className={`range__btn${p.days !== "all" && span === p.days ? " is-active" : ""}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="range__dates">
        <input type="date" className="range__date" value={f} max={t} onChange={(e) => setF(e.target.value)} />
        <span className="faint">→</span>
        <input type="date" className="range__date" value={t} min={f} max={today} onChange={(e) => setT(e.target.value)} />
        <button className="range__apply" onClick={() => apply(f, t)}>Aplicar</button>
      </div>
    </div>
  );
}
