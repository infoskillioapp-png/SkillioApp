import { getRecentPayments } from "@/lib/admin/metrics";
import { Strip, fmtArs, fmtDateTime } from "../_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPayments() {
  const payments = await getRecentPayments(100);
  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const total30 = payments.filter((p) => p.created_at >= d30).reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Pagos</h1>
          <p className="adm__sub">Se llenan desde el webhook de MercadoPago al confirmarse un cobro.</p>
        </div>
      </header>

      <Strip
        items={[
          { value: String(payments.length), label: "Pagos registrados" },
          { value: fmtArs(total), label: "Total cobrado" },
          { value: fmtArs(total30), label: "Cobrado · 30 días" },
        ]}
      />

      <div className="panel" style={{ padding: "8px 26px" }}>
        {payments.length === 0 ? (
          <div className="tbl__empty" style={{ textAlign: "center", padding: "36px 0" }}>
            Todavía no hay pagos registrados.
          </div>
        ) : (
          <div className="tbl__scroll">
            <table className="tbl" style={{ minWidth: 720 }}>
              <thead>
                <tr><th>Fecha</th><th>Usuario (Skillio)</th><th>Email MercadoPago</th><th>Tipo</th><th>Estado</th><th className="num">Monto</th></tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i}>
                    <td className="mono" style={{ fontSize: 12.5, whiteSpace: "nowrap" }}>{fmtDateTime(p.created_at)}</td>
                    <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.user_email ?? "—"}</td>
                    <td className="faint" style={{ maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12.5 }}>{p.email && p.email !== p.user_email ? p.email : "—"}</td>
                    <td>{p.kind === "authorized_payment" ? "Suscripción" : "Pago"}</td>
                    <td>{p.status}</td>
                    <td className="num" style={{ fontWeight: 700 }}>{fmtArs(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
