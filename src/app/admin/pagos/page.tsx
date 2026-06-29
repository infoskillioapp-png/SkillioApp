import { getRecentPayments } from "@/lib/admin/metrics";
import { fmtArs, KpiCard, C } from "../_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPayments() {
  const payments = await getRecentPayments(100);
  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const total30 = payments.filter((p) => p.created_at >= d30).reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KpiCard label="Pagos registrados" value={String(payments.length)} />
        <KpiCard label="Total cobrado" value={fmtArs(total)} tone="green" />
        <KpiCard label="Cobrado · 30d" value={fmtArs(total30)} tone="violet" />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        {payments.length === 0 ? (
          <div className="p-8 text-center text-[13px]" style={{ color: C.muted }}>
            Todavía no hay pagos registrados. Aparecen cuando MercadoPago confirma un cobro
            (la tabla se llena desde el webhook).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[560px]">
              <thead>
                <tr className="text-left" style={{ color: C.muted, background: C.line2 }}>
                  <th className="font-semibold px-4 py-2.5">Fecha</th>
                  <th className="font-semibold px-2 py-2.5">Email</th>
                  <th className="font-semibold px-2 py-2.5">Tipo</th>
                  <th className="font-semibold px-2 py-2.5">Estado</th>
                  <th className="font-semibold px-4 py-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{new Date(p.created_at).toLocaleString("es-AR")}</td>
                    <td className="px-2 py-2.5 truncate max-w-[180px]">{p.email ?? "—"}</td>
                    <td className="px-2 py-2.5">{p.kind === "authorized_payment" ? "Suscripción" : "Pago"}</td>
                    <td className="px-2 py-2.5">{p.status}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmtArs(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
