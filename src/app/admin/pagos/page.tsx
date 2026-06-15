import { getRecentPayments } from "@/lib/admin/metrics";
import { fmtArs } from "../_components/ui";

export const dynamic = "force-dynamic";

export default async function AdminPayments() {
  const payments = await getRecentPayments(100);
  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-rule-soft bg-paper p-4">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-soft font-semibold mb-1.5">Pagos registrados</div>
          <div className="font-display font-extrabold text-2xl">{payments.length}</div>
        </div>
        <div className="rounded-2xl border border-rule-soft bg-paper p-4">
          <div className="text-[10.5px] uppercase tracking-[0.12em] text-ink-soft font-semibold mb-1.5">Total cobrado</div>
          <div className="font-display font-extrabold text-2xl text-accent">{fmtArs(total)}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-rule-soft bg-paper overflow-hidden">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-ink-soft">
            Todavía no hay pagos registrados. Empiezan a aparecer cuando MercadoPago
            confirme un cobro (la tabla se llena desde el webhook).
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] min-w-[560px]">
              <thead>
                <tr className="text-ink-soft text-left bg-paper-warm">
                  <th className="font-semibold px-4 py-2.5">Fecha</th>
                  <th className="font-semibold px-2 py-2.5">Email</th>
                  <th className="font-semibold px-2 py-2.5">Tipo</th>
                  <th className="font-semibold px-2 py-2.5">Estado</th>
                  <th className="font-semibold px-4 py-2.5 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i} className="border-t border-rule-soft">
                    <td className="px-4 py-2.5 whitespace-nowrap">{new Date(p.created_at).toLocaleString("es-AR")}</td>
                    <td className="px-2 py-2.5 truncate max-w-[180px]">{p.email ?? "—"}</td>
                    <td className="px-2 py-2.5">{p.kind === "authorized_payment" ? "Suscripción" : "Pago"}</td>
                    <td className="px-2 py-2.5">{p.status}</td>
                    <td className="px-4 py-2.5 text-right num font-semibold">{fmtArs(Number(p.amount))}</td>
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
