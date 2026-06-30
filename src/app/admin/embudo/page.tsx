import { getDashboard } from "@/lib/admin/metrics";
import { Panel, Funnel, fmtInt, fmtPct, resolveRange, rangeLabel } from "../_components/ui";
import { RangePicker } from "../_components/range-picker";

export const dynamic = "force-dynamic";

export default async function AdminEmbudo({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const r = resolveRange(from, to);
  const d = await getDashboard({ fromISO: r.fromISO, toISO: r.toISO });
  const pc = d.paywallConv;

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Embudo</h1>
          <p className="adm__sub">{rangeLabel(r.fromDay, r.toDay)}</p>
        </div>
        <RangePicker from={r.fromDay} to={r.toDay} />
      </header>

      <Panel
        title="Conversión de la cohorte"
        hint={`De los ${fmtInt(d.kpis.registros)} que se registraron en este período, hasta dónde llegaron. El % es la retención respecto del paso anterior — donde más cae, ahí hay que trabajar.`}
      >
        <Funnel steps={d.funnelSteps} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
          <span className="chip"><span className="d" style={{ background: "var(--green)" }} /><span>Activaron con apunte propio</span><b>{fmtInt(d.kpis.activadosCohort)}</b></span>
          <span className="chip"><span className="d" style={{ background: "var(--amber)" }} /><span>Solo probaron apunte demo</span><b>{fmtInt(d.kpis.demoTried)}</b></span>
        </div>
        <p className="panel__hint">
          La <b style={{ color: "var(--ink)" }}>activación</b> cuenta solo generaciones con material propio. Un apunte demo es contenido de ejemplo (sin IA): se mide aparte y no activa.
        </p>
      </Panel>

      <div className="grid2">
        <Panel title="Conversión del paywall">
          <div className="row"><span className="muted">Vieron el paywall</span><span className="mono" style={{ fontSize: 17, fontWeight: 700 }}>{fmtInt(pc.visto)}</span></div>
          <div className="row">
            <span className="muted">Iniciaron checkout</span>
            <span><span className="mono" style={{ color: "var(--blue)", fontSize: 12, fontWeight: 700, marginRight: 8 }}>{fmtPct(pc.checkoutRate)}</span><span className="mono" style={{ fontSize: 17, fontWeight: 700 }}>{fmtInt(pc.checkout)}</span></span>
          </div>
          <div className="row">
            <span className="muted">Pagaron</span>
            <span><span className="mono" style={{ color: "var(--green)", fontSize: 12, fontWeight: 700, marginRight: 8 }}>{fmtPct(pc.pagoRate)}</span><span className="mono" style={{ fontSize: 17, fontWeight: 700, color: "var(--green)" }}>{fmtInt(pc.pago)}</span></span>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", marginTop: 18, paddingTop: 16 }}>
            <div className="adm__eyebrow" style={{ marginTop: 0 }}>Plan elegido en el paywall</div>
            <div className="list" style={{ marginTop: 14 }}>
              {d.planClicks.length === 0 && <div className="faint" style={{ fontSize: 13 }}>Sin clicks en el período.</div>}
              {d.planClicks.map((p) => (
                <div key={p.plan} className="row" style={{ margin: 0 }}>
                  <span style={{ textTransform: "capitalize" }}>{p.plan}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{fmtInt(p.count)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Adquisición por fuente (UTM)">
          <div className="tbl__scroll">
            <table className="tbl">
              <thead>
                <tr><th>Fuente</th><th className="num">Reg.</th><th className="num">Activ.</th><th className="num">Pagan</th></tr>
              </thead>
              <tbody>
                {d.acquisition.length === 0 && <tr><td colSpan={4} className="tbl__empty">Sin datos en el período.</td></tr>}
                {d.acquisition.slice(0, 12).map((a) => (
                  <tr key={a.source}>
                    <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.source}</td>
                    <td className="num">{a.total}</td>
                    <td className="num">{a.activated}</td>
                    <td className="num" style={{ color: "var(--green)", fontWeight: 700 }}>{a.paying}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="grid2">
        <Panel title="Generaciones por tipo">
          <div className="list">
            {d.usageByKind.length === 0 && <div className="faint" style={{ fontSize: 13 }}>Sin generaciones en el período.</div>}
            {d.usageByKind.map((u) => (
              <div key={u.kind} className="row" style={{ margin: 0 }}>
                <span style={{ textTransform: "capitalize" }}>{u.kind}</span>
                <span className="mono" style={{ fontWeight: 700 }}>{fmtInt(u.count)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Uso por modelo de IA">
          <div className="tbl__scroll">
            <table className="tbl">
              <thead>
                <tr><th>Modelo</th><th className="num">Gen.</th><th className="num">Tok. in</th><th className="num">Tok. out</th></tr>
              </thead>
              <tbody>
                {d.usageByModel.length === 0 && <tr><td colSpan={4} className="tbl__empty">Sin datos en el período.</td></tr>}
                {d.usageByModel.map((m) => (
                  <tr key={m.model}>
                    <td>{m.model.replace("claude-", "")}</td>
                    <td className="num">{m.count}</td>
                    <td className="num">{fmtInt(m.inTok)}</td>
                    <td className="num">{fmtInt(m.outTok)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
