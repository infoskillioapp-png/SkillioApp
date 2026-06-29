import { getDashboard } from "@/lib/admin/metrics";
import { Panel, Funnel, fmtInt, fmtPct, resolveRange, rangeLabel } from "../_components/ui";
import { RangePicker } from "../_components/range-picker";

export const dynamic = "force-dynamic";

export default async function AdminTour({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const r = resolveRange(from, to);
  const d = await getDashboard({ fromISO: r.fromISO, toISO: r.toISO });

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Tour guiado</h1>
          <p className="adm__sub">{rangeLabel(r.fromDay, r.toDay)}</p>
        </div>
        <RangePicker from={r.fromDay} to={r.toDay} />
      </header>

      {d.tours.length === 0 ? (
        <Panel title="Sin datos todavía">
          <p className="muted" style={{ fontSize: 14 }}>
            Los tours empiezan a registrarse cuando usuarios nuevos los recorren. Volvé cuando entre tráfico nuevo en este período.
          </p>
        </Panel>
      ) : (
        <div className="grid2">
          {d.tours.map((t) => (
            <Panel key={t.name} title={`Tour · ${t.name}`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                <span className="chip"><span className="d" style={{ background: "var(--violet)" }} /><span>Iniciaron</span><b>{fmtInt(t.started)}</b></span>
                <span className="chip"><span className="d" style={{ background: "var(--green)" }} /><span>Completaron</span><b>{fmtInt(t.completed)} · {fmtPct(t.completionRate)}</b></span>
                <span className="chip"><span className="d" style={{ background: "var(--red)" }} /><span>Skipearon</span><b>{fmtInt(t.skipped)} · {fmtPct(t.skipRate)}</b></span>
              </div>
              <Funnel
                steps={[
                  { label: "Iniciaron", value: t.started },
                  ...t.steps.map((s) => ({ label: `Etapa ${s.n}`, value: s.users })),
                  { label: "Completaron", value: t.completed },
                ]}
              />
              {t.skipBy.length > 0 && (
                <p className="panel__hint">
                  <span style={{ color: "var(--ink)", fontWeight: 700 }}>Abandonos por etapa:</span>{" "}
                  {t.skipBy.map((s) => `Etapa ${s.n}: ${s.count}`).join("  ·  ")}
                </p>
              )}
            </Panel>
          ))}
        </div>
      )}

      {d.tourSkippers.length > 0 && (
        <Panel title="Quiénes skipearon (últimos del período)">
          <div className="tbl__scroll">
            <table className="tbl">
              <thead>
                <tr><th>Email</th><th>Tour</th><th className="num">Etapa</th><th className="num">Cuándo</th></tr>
              </thead>
              <tbody>
                {d.tourSkippers.map((s, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</td>
                    <td>{s.tour}</td>
                    <td className="num">{s.step || "—"}</td>
                    <td className="num faint" style={{ whiteSpace: "nowrap" }}>{new Date(s.at).toLocaleString("es-AR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </>
  );
}
