// Primitivos de la consola admin. Server components, estilados con admin.css.

import type { RangeInput } from "@/lib/admin/metrics";

// ---- formato ----
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es-AR");
}
export function fmtArs(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}
export function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

// ---- rango de fechas (compartido por las páginas) ----
export function resolveRange(from?: string, to?: string): RangeInput & { fromDay: string; toDay: string } {
  const today = new Date();
  const toDay = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today.toISOString().slice(0, 10);
  const defFrom = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const fromDay = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defFrom;
  return { fromDay, toDay, fromISO: fromDay + "T00:00:00.000Z", toISO: toDay + "T23:59:59.999Z" };
}
export function rangeLabel(fromDay: string, toDay: string): string {
  const d = Math.round((new Date(toDay).getTime() - new Date(fromDay).getTime()) / 86400000) + 1;
  return `${fromDay} → ${toDay} · ${d} día${d === 1 ? "" : "s"}`;
}

// ---- componentes ----
export function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent?: "violet" | "blue" | "green";
}) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className={`kpi__value${accent ? ` is-${accent}` : ""}`}>{value}</div>
      {sub && <div className="kpi__sub">{sub}</div>}
    </div>
  );
}

export function Panel({
  title,
  hint,
  right,
  children,
}: {
  title?: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      {(title || right) && (
        <div className="panel__head">
          {title && <h2 className="panel__title">{title}</h2>}
          {right}
        </div>
      )}
      {children}
      {hint && <p className="panel__hint">{hint}</p>}
    </section>
  );
}

export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="funnel">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : s.value;
        const drop = prev > 0 ? (s.value / prev) * 100 : 0;
        return (
          <div key={s.label} className="funnel__row">
            <div className="funnel__label">{s.label}</div>
            <div className="funnel__track">
              <div className="funnel__fill" style={{ width: `${(s.value / top) * 100}%` }}>
                {s.value > 0 ? s.value.toLocaleString("es-AR") : ""}
              </div>
            </div>
            <div className={`funnel__pct${i === 0 ? " is-faint" : ""}`}>{i === 0 ? "—" : `${drop.toFixed(0)}%`}</div>
          </div>
        );
      })}
    </div>
  );
}

export function Bars({
  data,
  color = "var(--violet)",
  fmt,
}: {
  data: { day: string; value: number }[];
  color?: string;
  fmt?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { day: "", value: 0 });
  return (
    <div>
      <div className="bars">
        {data.map((d, i) => (
          <div
            key={i}
            className="bars__bar"
            title={`${d.day}: ${d.value}`}
            style={{
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
              background: color,
              opacity: d.value > 0 ? 1 : 0.15,
            }}
          />
        ))}
      </div>
      <div className="bars__foot">
        <span>Total <b>{fmt ? fmt(total) : total.toLocaleString("es-AR")}</b></span>
        {peak && peak.value > 0 && <span>Pico {fmt ? fmt(peak.value) : peak.value} · {peak.day.slice(5)}</span>}
      </div>
    </div>
  );
}

export function Strip({ items }: { items: { value: string; label: string }[] }) {
  return (
    <div className="strip">
      {items.map((it, i) => (
        <div key={i} className="strip__cell">
          <div className="strip__val">{it.value}</div>
          <div className="strip__lab">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const cls = plan === "pro" ? "pro" : plan === "trimestral" ? "trimestral" : plan === "semanal" ? "semanal" : "free";
  const label = plan === "pro" ? "MENSUAL" : plan.toUpperCase();
  return <span className={`badge badge--${cls}`}>{label}</span>;
}
