import { getDashboard } from "@/lib/admin/metrics";
import { KpiCard, BarChart, Section, fmtInt, fmtArs, fmtPct } from "./_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const d = await getDashboard();
  const k = d.kpis;
  const maxFunnel = Math.max(1, ...d.funnelSteps.map((s) => s.value));

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Registros" value={fmtInt(k.totalUsers)} sub={`+${k.reg7} en 7d · +${k.reg30} en 30d`} accent />
        <KpiCard label="Activados" value={fmtInt(k.activated)} sub={`${fmtPct(k.activationRate)} de los onboardeados`} />
        <KpiCard label="PRO activos" value={fmtInt(k.pro)} sub={`MRR estimado ${fmtArs(k.mrrArs)}`} accent />
        <KpiCard label="Demos completados" value={fmtInt(k.demoDone)} sub={`${fmtInt(k.onboarded)} onboardeados`} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Generaciones IA" value={fmtInt(k.totalGenerations)} sub={`+${k.gen7} en 7d`} />
        <KpiCard label="Tokens totales" value={fmtInt(k.totalTokens)} sub={`${fmtInt(k.inTok)} in · ${fmtInt(k.outTok)} out`} />
        <KpiCard label="Costo IA estimado" value={"US$ " + k.costUsd.toFixed(2)} sub="desde el tracking de tokens" />
        <KpiCard label="Ingresos registrados" value={fmtArs(k.revenueArs)} sub={`${fmtInt(k.paymentsCount)} pagos`} accent />
      </div>

      {/* Series diarias */}
      <div className="grid md:grid-cols-3 gap-4">
        <Section title="Registros · 30 días">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.registros }))} />
        </Section>
        <Section title="Activaciones · 30 días">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.activaciones }))} />
        </Section>
        <Section title="Generaciones IA · 30 días">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.generaciones }))} />
        </Section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Funnel */}
        <Section title="Funnel onboarding → activación">
          <div className="space-y-2.5">
            {d.funnelSteps.map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-44 text-[12.5px] text-ink-soft shrink-0">{s.label}</div>
                <div className="flex-1 h-6 rounded-md bg-paper-warm overflow-hidden">
                  <div
                    className="h-full bg-accent/80 rounded-md flex items-center justify-end px-2 text-[11px] font-bold text-[#FBF1EF]"
                    style={{ width: `${(s.value / maxFunnel) * 100}%`, minWidth: s.value > 0 ? 28 : 0 }}
                  >
                    {s.value > 0 ? s.value : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Adquisición por UTM */}
        <Section title="Adquisición por fuente (UTM)">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-soft text-left">
                <th className="font-semibold pb-2">Fuente</th>
                <th className="font-semibold pb-2 text-right">Reg.</th>
                <th className="font-semibold pb-2 text-right">Activ.</th>
                <th className="font-semibold pb-2 text-right">PRO</th>
              </tr>
            </thead>
            <tbody>
              {d.acquisition.slice(0, 10).map((a) => (
                <tr key={a.source} className="border-t border-rule-soft">
                  <td className="py-1.5 truncate max-w-[160px]">{a.source}</td>
                  <td className="py-1.5 text-right num">{a.total}</td>
                  <td className="py-1.5 text-right num">{a.activated}</td>
                  <td className="py-1.5 text-right num text-accent font-bold">{a.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      {/* Usos por tipo y modelo */}
      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Generaciones por tipo">
          <div className="space-y-2">
            {d.usageByKind.map((u) => (
              <div key={u.kind} className="flex items-center justify-between text-[13px]">
                <span className="capitalize">{u.kind}</span>
                <span className="num font-semibold">{fmtInt(u.count)}</span>
              </div>
            ))}
            {d.usageByKind.length === 0 && <div className="text-[12.5px] text-ink-soft">Sin datos todavía.</div>}
          </div>
        </Section>
        <Section title="Uso por modelo (tokens)">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-ink-soft text-left">
                <th className="font-semibold pb-2">Modelo</th>
                <th className="font-semibold pb-2 text-right">Gen.</th>
                <th className="font-semibold pb-2 text-right">In</th>
                <th className="font-semibold pb-2 text-right">Out</th>
              </tr>
            </thead>
            <tbody>
              {d.usageByModel.map((m) => (
                <tr key={m.model} className="border-t border-rule-soft">
                  <td className="py-1.5 truncate max-w-[160px]" title={m.model}>{m.model.replace("claude-", "")}</td>
                  <td className="py-1.5 text-right num">{m.count}</td>
                  <td className="py-1.5 text-right num">{fmtInt(m.inTok)}</td>
                  <td className="py-1.5 text-right num">{fmtInt(m.outTok)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
