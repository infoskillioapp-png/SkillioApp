// Primitivos de UI del panel admin (server components, sin estado).

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-rule-soft bg-paper p-4">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-soft font-semibold mb-1.5">
        {label}
      </div>
      <div
        className={`font-display font-extrabold text-2xl tracking-[-0.02em] ${accent ? "text-accent" : "text-ink"}`}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] text-ink-soft mt-1">{sub}</div>}
    </div>
  );
}

// Mini bar chart (3 series superpuestas no — barras simples de una serie).
export function BarChart({
  data,
  height = 120,
}: {
  data: { day: string; value: number }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-[3px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end group relative">
          <div
            className="w-full rounded-t-[3px] bg-accent/80 hover:bg-accent transition-colors"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
            title={`${d.day}: ${d.value}`}
          />
        </div>
      ))}
    </div>
  );
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-rule-soft bg-paper p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-[15px]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("es-AR");
}
export function fmtArs(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-AR");
}
export function fmtPct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}
