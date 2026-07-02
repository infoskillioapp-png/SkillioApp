import { getFeedback } from "@/lib/admin/metrics";
import { Panel, Strip, fmtInt, fmtDateTime } from "../_components/ui";

export const dynamic = "force-dynamic";

function Stars({ n }: { n: number }) {
  return (
    <span aria-label={`${n} de 5`} style={{ letterSpacing: 1, whiteSpace: "nowrap" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= n ? "var(--amber)" : "var(--border)", fontSize: 15 }}>
          {i <= n ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export default async function AdminFeedback() {
  const d = await getFeedback(300);
  const conComentario = d.items.filter((f) => f.comment && f.comment.trim());
  const maxRating = Math.max(1, ...d.byRating.map((r) => r.count));

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Feedback</h1>
          <p className="adm__sub">Reseñas y puntajes que dejan los usuarios dentro de la app.</p>
        </div>
      </header>

      <Strip
        items={[
          { value: fmtInt(d.total), label: "Reseñas totales" },
          { value: d.total ? d.avg.toFixed(2) + " ★" : "—", label: "Puntaje promedio" },
          { value: fmtInt(d.withComment), label: "Con comentario escrito" },
        ]}
      />

      <Panel title="Distribución por puntaje">
        <div className="funnel">
          {d.byRating.map((r) => (
            <div key={r.stars} className="funnel__row">
              <div className="funnel__label"><Stars n={r.stars} /></div>
              <div className="funnel__track">
                <div className="funnel__fill" style={{ width: `${(r.count / maxRating) * 100}%` }}>
                  {r.count > 0 ? r.count : ""}
                </div>
              </div>
              <div className="funnel__pct is-faint">{d.total ? ((r.count / d.total) * 100).toFixed(0) + "%" : "—"}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title={`Reseñas con comentario · ${conComentario.length}`}>
        {conComentario.length === 0 ? (
          <div className="tbl__empty">Todavía nadie dejó un comentario escrito.</div>
        ) : (
          <div className="list" style={{ gap: 0 }}>
            {conComentario.map((f, i) => (
              <div key={i} style={{ padding: "16px 0", borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                  <Stars n={f.rating} />
                  <span className="faint mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDateTime(f.created_at)}</span>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--ink)", margin: "0 0 8px" }}>“{f.comment}”</p>
                <div className="faint" style={{ fontSize: 12.5 }}>
                  {f.email}{f.page ? ` · ${f.page}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
