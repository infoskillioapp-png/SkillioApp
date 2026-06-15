import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/admin/metrics";
import { ActionsPanel } from "./actions-panel";
import { fmtInt } from "../../_components/ui";

export const dynamic = "force-dynamic";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR");
}

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, outputs, payments } = await getUserDetail(id);
  if (!user) notFound();

  const rows: [string, string][] = [
    ["Email", user.email],
    ["Plan", user.plan === "pro" ? "PRO" : "Free"],
    ["Créditos", String(user.credits)],
    ["Generaciones gratis usadas", `${user.free_generations_used} / 3`],
    ["Activado", user.activated_at ? fmtDate(user.activated_at) : "No"],
    ["Demo completado", user.demo_completed ? "Sí" : "No"],
    ["Onboarding", user.onboarding_completed ? "Sí" : "No"],
    ["Racha", `${user.current_streak} días`],
    ["XP", String(user.total_xp)],
    ["Carrera", user.career ?? "—"],
    ["Institución", user.institution ?? "—"],
    ["Teléfono", user.phone ?? "—"],
    ["Alta", fmtDate(user.created_at)],
  ];

  const utm = user.acquisition
    ? Object.entries(user.acquisition).map(([k, v]) => `${k}=${v}`).join(" · ")
    : "—";

  return (
    <div className="space-y-5">
      <Link href="/admin/usuarios" className="text-[13px] text-ink-soft hover:text-accent">← Volver a usuarios</Link>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-extrabold text-2xl tracking-[-0.02em]">
          {user.full_name ?? user.email}
        </h1>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <div className="rounded-2xl border border-rule-soft bg-paper p-5">
            <h2 className="font-display font-bold text-[15px] mb-3">Datos</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-rule-soft py-1.5">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="font-semibold text-right truncate">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 text-[11.5px] text-ink-soft">
              <span className="font-semibold">Adquisición:</span> {utm}
            </div>
          </div>

          <div className="rounded-2xl border border-rule-soft bg-paper p-5">
            <h2 className="font-display font-bold text-[15px] mb-3">
              Últimas generaciones ({outputs.length})
            </h2>
            {outputs.length === 0 ? (
              <div className="text-[12.5px] text-ink-soft">Todavía no generó nada.</div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-ink-soft text-left">
                    <th className="font-semibold pb-1.5">Tipo</th>
                    <th className="font-semibold pb-1.5">Modelo</th>
                    <th className="font-semibold pb-1.5 text-right">Tokens</th>
                    <th className="font-semibold pb-1.5 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {outputs.map((o, i) => (
                    <tr key={i} className="border-t border-rule-soft">
                      <td className="py-1.5 capitalize">{o.kind}</td>
                      <td className="py-1.5 truncate max-w-[120px]">{(o.model ?? "").replace("claude-", "")}</td>
                      <td className="py-1.5 text-right num">{fmtInt((o.input_tokens ?? 0) + (o.output_tokens ?? 0))}</td>
                      <td className="py-1.5 text-right text-ink-soft whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {payments.length > 0 && (
            <div className="rounded-2xl border border-rule-soft bg-paper p-5">
              <h2 className="font-display font-bold text-[15px] mb-3">Pagos ({payments.length})</h2>
              <table className="w-full text-[12px]">
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} className="border-t border-rule-soft">
                      <td className="py-1.5">{new Date(p.created_at).toLocaleDateString("es-AR")}</td>
                      <td className="py-1.5 text-right num font-semibold">
                        ${Math.round(Number(p.amount)).toLocaleString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ActionsPanel userId={user.id} plan={user.plan} />
      </div>
    </div>
  );
}
