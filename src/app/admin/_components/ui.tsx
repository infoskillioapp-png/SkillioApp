// Primitivos de UI del panel admin — tema Skillio 3.0 (violeta/lavanda).
// Server components, sin estado. Colores por inline-style (las CSS vars del
// tema viven en globals.css); el layout usa utilidades core de Tailwind.

export const C = {
  ink: "#1f2347",
  muted: "#8487a6",
  faint: "#aab2c8",
  card: "#ffffff",
  line: "#eef0f6",
  line2: "#f4f5fb",
  violet: "#8b5cf6",
  blue: "#4f7dff",
  green: "#10b981",
  amber: "#ffb020",
  red: "#e4264f",
  po: '"Poppins",-apple-system,system-ui,sans-serif',
};

const CARD_SHADOW =
  "0 2px 4px rgba(40,44,90,.04), 0 10px 22px rgba(72,56,142,.08)";

type Tone = "violet" | "blue" | "green" | "ink";
const toneColor: Record<Tone, string> = {
  violet: C.violet,
  blue: C.blue,
  green: C.green,
  ink: C.ink,
};

export function KpiCard({
  label,
  value,
  sub,
  tone = "ink",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: CARD_SHADOW }}
    >
      <div
        className="text-[10.5px] uppercase font-semibold mb-1.5"
        style={{ letterSpacing: "0.12em", color: C.muted }}
      >
        {label}
      </div>
      <div
        className="text-2xl tracking-[-0.02em]"
        style={{ fontFamily: C.po, fontWeight: 800, color: toneColor[tone] }}
      >
        {value}
      </div>
      {sub && <div className="text-[11.5px] mt-1" style={{ color: C.muted }}>{sub}</div>}
    </div>
  );
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{ background: C.card, border: `1px solid ${C.line}`, boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px]" style={{ fontFamily: C.po, fontWeight: 700, color: C.ink }}>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export function BarChart({
  data,
  height = 120,
  color = C.violet,
  fmt,
}: {
  data: { day: string; value: number }[];
  height?: number;
  color?: string;
  fmt?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { day: "", value: 0 });
  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[3px] transition-all"
            title={`${d.day}: ${d.value}`}
            style={{
              // % de la altura del contenedor (height fijo arriba) → la barra crece de verdad.
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
              background: color,
              opacity: d.value > 0 ? 0.9 : 0.12,
              // tope de ancho: con pocos días no se vuelve un bloque gigante
              maxWidth: 44,
              minWidth: 2,
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-[10.5px]" style={{ color: C.muted }}>
        <span>Total: <b style={{ color: C.ink }}>{fmt ? fmt(total) : total.toLocaleString("es-AR")}</b></span>
        {peak && peak.value > 0 && (
          <span>Pico {fmt ? fmt(peak.value) : peak.value} · {peak.day.slice(5)}</span>
        )}
      </div>
    </div>
  );
}

// Funnel con barras decrecientes + % respecto del paso anterior y del tope.
export function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : s.value;
        const dropPct = prev > 0 ? (s.value / prev) * 100 : 0;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <div className="w-52 text-[12.5px] shrink-0" style={{ color: C.muted }}>
              {s.label}
            </div>
            <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: C.line2 }}>
              <div
                className="h-full rounded-lg flex items-center justify-end px-2 text-[11px] font-bold text-white"
                style={{
                  width: `${(s.value / top) * 100}%`,
                  minWidth: s.value > 0 ? 34 : 0,
                  background: `linear-gradient(90deg, ${C.blue}, ${C.violet})`,
                }}
              >
                {s.value > 0 ? s.value : ""}
              </div>
            </div>
            <div className="w-12 text-right text-[11.5px] font-semibold" style={{ color: i === 0 ? C.faint : C.ink }}>
              {i === 0 ? "—" : `${dropPct.toFixed(0)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pro: { bg: "linear-gradient(135deg,#8b5cf6,#4f7dff)", fg: "#fff", label: "MENSUAL" },
    trimestral: { bg: "linear-gradient(135deg,#c026d3,#db2777)", fg: "#fff", label: "TRIMESTRAL" },
    semanal: { bg: "linear-gradient(135deg,#4f7dff,#6a5bff)", fg: "#fff", label: "SEMANAL" },
    free: { bg: "#f4f5fb", fg: "#8487a6", label: "FREE" },
  };
  const s = map[plan] ?? map.free;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: s.bg, color: s.fg, letterSpacing: "0.04em" }}
    >
      {s.label}
    </span>
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
