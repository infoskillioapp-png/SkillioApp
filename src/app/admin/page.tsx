import { getDashboard } from "@/lib/admin/metrics";
import { Kpi, Panel, Bars, Strip, fmtInt, fmtArs, fmtPct, resolveRange, rangeLabel } from "./_components/ui";
import { RangePicker } from "./_components/range-picker";

export const dynamic = "force-dynamic";

export default async function AdminResumen({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const r = resolveRange(from, to);
  const d = await getDashboard({ fromISO: r.fromISO, toISO: r.toISO });
  const k = d.kpis;

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Resumen</h1>
          <p className="adm__sub">{rangeLabel(r.fromDay, r.toDay)}</p>
        </div>
        <RangePicker from={r.fromDay} to={r.toDay} />
      </header>

      <div className="adm__eyebrow">En el período</div>
      <div className="kpis">
        <Kpi label="Registros" value={fmtInt(k.registros)} accent="violet" sub={<>+<b>{k.reg7}</b> en los últimos 7 días</>} />
        <Kpi label="Activados" value={fmtInt(k.activados)} accent="blue" sub={<><b>{fmtPct(k.activationRate)}</b> de los registros</>} />
        <Kpi label="Generaciones IA" value={fmtInt(k.generaciones)} sub={<><b>{fmtInt(k.totalTokens)}</b> tokens</>} />
        <Kpi label="Ingresos" value={fmtArs(k.revenueArs)} accent="green" sub={<>Costo IA <b>US$ {k.costUsd.toFixed(2)}</b></>} />
      </div>

      <div className="grid2">
        <Panel title="Registros por día">
          <Bars data={d.series.map((s) => ({ day: s.day, value: s.registros }))} color="var(--violet)" />
        </Panel>
        <Panel title="Activaciones por día">
          <Bars data={d.series.map((s) => ({ day: s.day, value: s.activaciones }))} color="var(--blue)" />
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Generaciones por día">
          <Bars data={d.series.map((s) => ({ day: s.day, value: s.generaciones }))} color="var(--violet)" />
        </Panel>
        <Panel title="Ingresos por día">
          <Bars data={d.series.map((s) => ({ day: s.day, value: s.ingresos }))} color="var(--green)" fmt={fmtArs} />
        </Panel>
      </div>

      <div className="adm__eyebrow">Estado actual · total histórico</div>
      <Strip
        items={[
          { value: fmtInt(k.totalUsers), label: "Usuarios totales" },
          { value: fmtInt(k.paying), label: `Pagando ahora · ${fmtPct(k.payRate)}` },
          { value: fmtArs(k.mrrArs), label: "MRR estimado" },
          { value: fmtArs(k.totalRevenueAll), label: "Ingresos históricos" },
        ]}
      />

      <Panel title="Distribución por plan">
        <div className="funnel">
          {d.planBreakdown.map((p) => {
            const max = Math.max(1, ...d.planBreakdown.map((x) => x.count));
            return (
              <div key={p.plan} className="funnel__row">
                <div className="funnel__label">{p.plan}</div>
                <div className="funnel__track">
                  <div className="funnel__fill" style={{ width: `${(p.count / max) * 100}%` }}>
                    {p.count > 0 ? p.count : ""}
                  </div>
                </div>
                <div className="funnel__pct is-faint">{k.totalUsers > 0 ? fmtPct(p.count / k.totalUsers) : "—"}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
