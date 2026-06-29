import { getAiCosts, type AiCostBucket } from "@/lib/admin/metrics";
import { Panel, PlanBadge, fmtInt, resolveRange, rangeLabel } from "../_components/ui";
import { RangePicker } from "../_components/range-picker";

export const dynamic = "force-dynamic";

function usd(n: number, dp = 2): string {
  return "US$ " + n.toFixed(dp);
}

export default async function AdminCostos({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const r = resolveRange(from, to);
  const { segments, proUsers } = await getAiCosts({ fromISO: r.fromISO, toISO: r.toISO });

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Costos de IA</h1>
          <p className="adm__sub">{rangeLabel(r.fromDay, r.toDay)}</p>
        </div>
        <RangePicker from={r.fromDay} to={r.toDay} />
      </header>

      <div className="adm__eyebrow">Gasto por segmento</div>
      <div className="kpis">
        <CostCard title="Free" bucket={segments.free} />
        <CostCard title="Pro (semanal · mensual · trimestral)" bucket={segments.pro} accent="is-violet" />
        <CostCard title="Total" bucket={segments.total} accent="is-green" />
      </div>

      <Panel
        title={`Consumo de IA por usuario pago · ${proUsers.length}`}
        hint="Suma de tokens y costo estimado de cada usuario con plan pago (semanal, mensual o trimestral), en el período. Ordenado por gasto."
      >
        {proUsers.length === 0 ? (
          <div className="tbl__empty">Ningún usuario pago generó con IA en este período.</div>
        ) : (
          <div className="tbl__scroll">
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Usuario</th><th>Plan</th>
                  <th className="num">Gen.</th><th className="num">Tok. in</th>
                  <th className="num">Tok. out</th><th className="num">Total tok.</th><th className="num">Costo</th>
                </tr>
              </thead>
              <tbody>
                {proUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</td>
                    <td><PlanBadge plan={u.plan} /></td>
                    <td className="num">{fmtInt(u.gen)}</td>
                    <td className="num">{fmtInt(u.inTok)}</td>
                    <td className="num">{fmtInt(u.outTok)}</td>
                    <td className="num">{fmtInt(u.inTok + u.outTok)}</td>
                    <td className="num" style={{ color: "var(--green)", fontWeight: 700 }}>{usd(u.usd, u.usd < 1 ? 4 : 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function CostCard({ title, bucket, accent }: { title: string; bucket: AiCostBucket; accent?: "is-violet" | "is-green" }) {
  return (
    <div className="panel">
      <div className="kpi__label">{title}</div>
      <div className={`kpi__value ${accent ?? ""}`} style={{ fontSize: 40, marginTop: 10 }}>{usd(bucket.usd)}</div>
      <div className="kpi__sub" style={{ marginBottom: 16 }}><b>{fmtInt(bucket.gen)}</b> generaciones</div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
        <CostRow label="Tokens in" value={fmtInt(bucket.inTok)} />
        <CostRow label="Tokens out" value={fmtInt(bucket.outTok)} />
        <CostRow label="Tokens total" value={fmtInt(bucket.inTok + bucket.outTok)} strong />
      </div>
    </div>
  );
}

function CostRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="row" style={{ margin: 0, padding: "6px 0" }}>
      <span className="muted" style={{ fontSize: 13 }}>{label}</span>
      <span className="mono" style={{ fontWeight: strong ? 700 : 500, color: strong ? "var(--ink)" : "var(--ink2)" }}>{value}</span>
    </div>
  );
}
