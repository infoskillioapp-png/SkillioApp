import { getDashboard, type RangeInput } from "@/lib/admin/metrics";
import { KpiCard, BarChart, Section, Funnel, fmtInt, fmtArs, fmtPct, C } from "./_components/ui";
import { RangePicker } from "./_components/range-picker";

export const dynamic = "force-dynamic";

function resolveRange(from?: string, to?: string): RangeInput & { fromDay: string; toDay: string } {
  const today = new Date();
  const toDay = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today.toISOString().slice(0, 10);
  const defFrom = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const fromDay = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : defFrom;
  return {
    fromDay,
    toDay,
    fromISO: fromDay + "T00:00:00.000Z",
    toISO: toDay + "T23:59:59.999Z",
  };
}

function rangeLabel(fromDay: string, toDay: string): string {
  const d = Math.round((new Date(toDay).getTime() - new Date(fromDay).getTime()) / 86400000) + 1;
  return `${fromDay} → ${toDay} · ${d} día${d === 1 ? "" : "s"}`;
}

export default async function AdminOverview({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const r = resolveRange(from, to);
  const d = await getDashboard({ fromISO: r.fromISO, toISO: r.toISO });
  const k = d.kpis;

  return (
    <div className="space-y-6">
      {/* Selector de fechas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px]" style={{ fontFamily: C.po, fontWeight: 800 }}>Resumen</h1>
          <p className="text-[12px]" style={{ color: C.muted }}>Período: {rangeLabel(r.fromDay, r.toDay)}</p>
        </div>
        <RangePicker from={r.fromDay} to={r.toDay} />
      </div>

      {/* ====== EN EL PERÍODO ====== */}
      <SectionTitle>En el período seleccionado</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Registros" value={fmtInt(k.registros)} sub={`${reg7Sub(k.reg7)}`} tone="violet" />
        <KpiCard label="Activados" value={fmtInt(k.activadosCohort)} sub={`${fmtPct(k.activationRate)} de los registros`} tone="blue" />
        <KpiCard label="Generaciones IA" value={fmtInt(k.generaciones)} sub={`${fmtInt(k.totalTokens)} tokens`} />
        <KpiCard label="Ingresos del período" value={fmtArs(k.revenueArs)} sub={`Costo IA US$ ${k.costUsd.toFixed(2)}`} tone="green" />
      </div>

      {/* Series diarias */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Section title="Registros"><BarChart data={d.series.map((s) => ({ day: s.day, value: s.registros }))} color={C.violet} /></Section>
        <Section title="Activaciones"><BarChart data={d.series.map((s) => ({ day: s.day, value: s.activaciones }))} color={C.blue} /></Section>
        <Section title="Generaciones"><BarChart data={d.series.map((s) => ({ day: s.day, value: s.generaciones }))} color={C.violet} /></Section>
        <Section title="Ingresos"><BarChart data={d.series.map((s) => ({ day: s.day, value: s.ingresos }))} color={C.green} fmt={fmtArs} /></Section>
      </div>

      {/* Funnel */}
      <Section title="Funnel de conversión (cohorte registrada en el período)">
        <Funnel steps={d.funnelSteps} />
        <p className="text-[11.5px] mt-3" style={{ color: C.muted }}>
          De los {fmtInt(k.registros)} que se registraron en este rango, hasta dónde llegaron. El % es la retención respecto del paso anterior.
        </p>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Conversión del paywall">
          <div className="space-y-3">
            <Row label="Vieron el paywall" value={fmtInt(d.paywallConv.visto)} />
            <Row label="Iniciaron checkout" value={fmtInt(d.paywallConv.checkout)} hint={fmtPct(d.paywallConv.checkoutRate)} />
            <Row label="Pagaron" value={fmtInt(d.paywallConv.pago)} hint={fmtPct(d.paywallConv.pagoRate)} tone={C.green} />
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-[11px] uppercase font-semibold mb-2" style={{ letterSpacing: "0.1em", color: C.muted }}>Plan elegido en el paywall</div>
            {d.planClicks.length === 0 ? (
              <div className="text-[12.5px]" style={{ color: C.muted }}>Sin clicks en el período.</div>
            ) : (
              <div className="space-y-1.5">
                {d.planClicks.map((p) => (
                  <div key={p.plan} className="flex items-center justify-between text-[13px]">
                    <span className="capitalize">{p.plan}</span>
                    <span style={{ fontFamily: C.po, fontWeight: 700 }}>{fmtInt(p.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title="Adquisición por fuente (UTM)">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left" style={{ color: C.muted }}>
                <th className="font-semibold pb-2">Fuente</th>
                <th className="font-semibold pb-2 text-right">Reg.</th>
                <th className="font-semibold pb-2 text-right">Activ.</th>
                <th className="font-semibold pb-2 text-right">Pagan</th>
              </tr>
            </thead>
            <tbody>
              {d.acquisition.length === 0 && (
                <tr><td className="py-2" style={{ color: C.muted }}>Sin datos en el período.</td></tr>
              )}
              {d.acquisition.slice(0, 10).map((a) => (
                <tr key={a.source} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="py-1.5 truncate max-w-[160px]">{a.source}</td>
                  <td className="py-1.5 text-right">{a.total}</td>
                  <td className="py-1.5 text-right">{a.activated}</td>
                  <td className="py-1.5 text-right font-bold" style={{ color: C.green }}>{a.paying}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Engagement de estudio (período)">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Simulacros hechos" value={fmtInt(k.simulacros)} />
            <MiniStat label="Pomodoros completados" value={fmtInt(k.pomosCompleted)} />
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-[11px] uppercase font-semibold mb-2" style={{ letterSpacing: "0.1em", color: C.muted }}>Generaciones por tipo</div>
            <div className="space-y-1.5">
              {d.usageByKind.map((u) => (
                <div key={u.kind} className="flex items-center justify-between text-[13px]">
                  <span className="capitalize">{u.kind}</span>
                  <span style={{ fontFamily: C.po, fontWeight: 700 }}>{fmtInt(u.count)}</span>
                </div>
              ))}
              {d.usageByKind.length === 0 && <div className="text-[12.5px]" style={{ color: C.muted }}>Sin generaciones en el período.</div>}
            </div>
          </div>
        </Section>

        <Section title="Uso por modelo de IA (período)">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left" style={{ color: C.muted }}>
                <th className="font-semibold pb-2">Modelo</th>
                <th className="font-semibold pb-2 text-right">Gen.</th>
                <th className="font-semibold pb-2 text-right">Tokens in</th>
                <th className="font-semibold pb-2 text-right">Tokens out</th>
              </tr>
            </thead>
            <tbody>
              {d.usageByModel.length === 0 && (
                <tr><td className="py-2" style={{ color: C.muted }}>Sin datos en el período.</td></tr>
              )}
              {d.usageByModel.map((m) => (
                <tr key={m.model} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="py-1.5 truncate max-w-[200px]" title={m.model}>{m.model.replace("claude-", "")}</td>
                  <td className="py-1.5 text-right">{m.count}</td>
                  <td className="py-1.5 text-right">{fmtInt(m.inTok)}</td>
                  <td className="py-1.5 text-right">{fmtInt(m.outTok)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {/* ====== ESTADO ACTUAL (no depende del rango) ====== */}
      <SectionTitle>Estado actual (total, no depende del rango)</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Usuarios totales" value={fmtInt(k.totalUsers)} tone="ink" />
        <KpiCard label="Pagando ahora" value={fmtInt(k.paying)} sub={`${fmtPct(k.payRate)} del total`} tone="green" />
        <KpiCard label="MRR estimado" value={fmtArs(k.mrrArs)} sub="recurrente mensual-equivalente" tone="violet" />
        <KpiCard label="Ingresos históricos" value={fmtArs(k.totalRevenueAll)} tone="green" />
      </div>

      <Section title="Distribución por plan (actual)">
        <div className="space-y-2.5">
          {d.planBreakdown.map((p) => {
            const max = Math.max(1, ...d.planBreakdown.map((x) => x.count));
            return (
              <div key={p.plan} className="flex items-center gap-3">
                <div className="w-28 text-[13px] shrink-0">{p.plan}</div>
                <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: C.line2 }}>
                  <div className="h-full rounded-md" style={{ width: `${(p.count / max) * 100}%`, minWidth: p.count > 0 ? 4 : 0, background: `linear-gradient(90deg,${C.blue},${C.violet})` }} />
                </div>
                <div className="w-10 text-right text-[13px]" style={{ fontFamily: C.po, fontWeight: 700 }}>{p.count}</div>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

function reg7Sub(reg7: number): string {
  return `+${reg7} en los últimos 7d (global)`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <h2 className="text-[12px] uppercase font-bold whitespace-nowrap" style={{ letterSpacing: "0.12em", color: C.muted }}>{children}</h2>
      <div className="flex-1 h-px" style={{ background: C.line }} />
    </div>
  );
}

function Row({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px]" style={{ color: C.muted }}>{label}</span>
      <span className="flex items-center gap-2">
        {hint && <span className="text-[11px] font-semibold" style={{ color: tone ?? C.blue }}>{hint}</span>}
        <span className="text-[15px]" style={{ fontFamily: C.po, fontWeight: 800, color: tone ?? C.ink }}>{value}</span>
      </span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: C.line2 }}>
      <div className="text-[18px]" style={{ fontFamily: C.po, fontWeight: 800, color: C.ink }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: C.muted }}>{label}</div>
    </div>
  );
}
