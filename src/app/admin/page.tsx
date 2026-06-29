import { getDashboard } from "@/lib/admin/metrics";
import { KpiCard, BarChart, Section, Funnel, fmtInt, fmtArs, fmtPct, C } from "./_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminOverview() {
  const d = await getDashboard();
  const k = d.kpis;

  return (
    <div className="space-y-6">
      {/* KPIs — adquisición y conversión */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Registros" value={fmtInt(k.totalUsers)} sub={`+${k.reg7} en 7d · +${k.reg30} en 30d`} tone="violet" />
        <KpiCard label="Activados" value={fmtInt(k.activated)} sub={`${fmtPct(k.activationRate)} de registros · +${k.act7} en 7d`} tone="blue" />
        <KpiCard label="Pagando" value={fmtInt(k.paying)} sub={`${fmtPct(k.payRate)} de registros`} tone="green" />
        <KpiCard label="MRR estimado" value={fmtArs(k.mrrArs)} sub="recurrente mensual-equivalente" tone="violet" />
      </div>

      {/* KPIs — plata y producción */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ingresos totales" value={fmtArs(k.revenueArs)} sub={`${fmtInt(k.paymentsCount)} pagos · ${fmtArs(k.rev30)} en 30d`} tone="green" />
        <KpiCard label="Generaciones IA" value={fmtInt(k.totalGenerations)} sub={`+${k.gen7} en 7d`} />
        <KpiCard label="Tokens totales" value={fmtInt(k.totalTokens)} sub={`${fmtInt(k.inTok)} in · ${fmtInt(k.outTok)} out`} />
        <KpiCard label="Costo IA estimado" value={"US$ " + k.costUsd.toFixed(2)} sub="según tokens registrados" />
      </div>

      {/* Series diarias */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Section title="Registros · 30d">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.registros }))} color={C.violet} />
        </Section>
        <Section title="Activaciones · 30d">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.activaciones }))} color={C.blue} />
        </Section>
        <Section title="Generaciones · 30d">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.generaciones }))} color={C.violet} />
        </Section>
        <Section title="Ingresos · 30d">
          <BarChart data={d.series.map((s) => ({ day: s.day, value: s.ingresos }))} color={C.green} />
        </Section>
      </div>

      {/* Funnel completo */}
      <Section title="Funnel de conversión (usuarios únicos por paso)">
        <Funnel steps={d.funnelSteps} />
        <p className="text-[11.5px] mt-3" style={{ color: C.muted }}>
          El % a la derecha es la retención respecto del paso anterior. Donde más cae es donde hay que trabajar.
        </p>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Conversión del paywall */}
        <Section title="Conversión del paywall">
          <div className="space-y-3">
            <Row label="Vieron el paywall" value={fmtInt(d.paywallConv.visto)} />
            <Row label="Iniciaron checkout" value={fmtInt(d.paywallConv.checkout)} hint={fmtPct(d.paywallConv.checkoutRate)} />
            <Row label="Pagaron" value={fmtInt(d.paywallConv.pago)} hint={fmtPct(d.paywallConv.pagoRate)} tone={C.green} />
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-[11px] uppercase font-semibold mb-2" style={{ letterSpacing: "0.1em", color: C.muted }}>
              Plan elegido en el paywall
            </div>
            {d.planClicks.length === 0 ? (
              <div className="text-[12.5px]" style={{ color: C.muted }}>Sin clicks todavía.</div>
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

        {/* Distribución por plan */}
        <Section title="Distribución por plan">
          <div className="space-y-2.5">
            {d.planBreakdown.map((p) => {
              const max = Math.max(1, ...d.planBreakdown.map((x) => x.count));
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <div className="w-28 text-[13px] shrink-0">{p.plan}</div>
                  <div className="flex-1 h-6 rounded-md overflow-hidden" style={{ background: C.line2 }}>
                    <div
                      className="h-full rounded-md"
                      style={{ width: `${(p.count / max) * 100}%`, minWidth: p.count > 0 ? 4 : 0, background: `linear-gradient(90deg,${C.blue},${C.violet})` }}
                    />
                  </div>
                  <div className="w-10 text-right text-[13px]" style={{ fontFamily: C.po, fontWeight: 700 }}>{p.count}</div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Adquisición por UTM */}
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

        {/* Engagement de estudio */}
        <Section title="Engagement de estudio">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Simulacros hechos" value={fmtInt(k.simulacros)} />
            <MiniStat label="Pomodoros completados" value={fmtInt(k.pomosCompleted)} />
            <MiniStat label="Con racha activa" value={fmtInt(k.usersWithStreak)} />
            <MiniStat label="XP total otorgado" value={fmtInt(k.totalXp)} />
          </div>
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="text-[11px] uppercase font-semibold mb-2" style={{ letterSpacing: "0.1em", color: C.muted }}>
              Generaciones por tipo
            </div>
            <div className="space-y-1.5">
              {d.usageByKind.map((u) => (
                <div key={u.kind} className="flex items-center justify-between text-[13px]">
                  <span className="capitalize">{u.kind}</span>
                  <span style={{ fontFamily: C.po, fontWeight: 700 }}>{fmtInt(u.count)}</span>
                </div>
              ))}
              {d.usageByKind.length === 0 && <div className="text-[12.5px]" style={{ color: C.muted }}>Sin datos.</div>}
            </div>
          </div>
        </Section>
      </div>

      {/* Uso por modelo */}
      <Section title="Uso por modelo de IA (tokens y costo)">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left" style={{ color: C.muted }}>
              <th className="font-semibold pb-2">Modelo</th>
              <th className="font-semibold pb-2 text-right">Generaciones</th>
              <th className="font-semibold pb-2 text-right">Tokens in</th>
              <th className="font-semibold pb-2 text-right">Tokens out</th>
            </tr>
          </thead>
          <tbody>
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
