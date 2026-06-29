import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/admin/metrics";
import { ActionsPanel } from "./actions-panel";
import { fmtInt, PlanBadge, C } from "../../_components/ui";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<string, string> = {
  registro_completado: "Completó el registro",
  apunte_subido: "Subió un apunte",
  paywall_visto: "Vio el paywall",
  paywall_plan_click: "Eligió un plan",
  checkout_iniciado: "Inició el checkout",
  pago_confirmado: "Pago confirmado",
  tour_inicio: "Inició un tour",
  tour_paso: "Tour · etapa",
  tour_completado: "Completó el tour",
  tour_skip: "Skipeó el tour",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR");
}

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, outputs, payments, funnelEvents } = await getUserDetail(id);
  if (!user) notFound();

  const rows: [string, React.ReactNode][] = [
    ["Email", user.email],
    ["Créditos", String(user.credits)],
    ["Generaciones gratis usadas", `${user.free_generations_used} / 3`],
    ["Activado", user.activated_at ? fmtDate(user.activated_at) : "No"],
    ["Onboarding", user.onboarding_completed ? "Sí" : "No"],
    ["Vence", user.expires_at ? fmtDate(user.expires_at) : "—"],
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

  const card = { background: C.card, border: `1px solid ${C.line}`, boxShadow: "0 2px 4px rgba(40,44,90,.04), 0 10px 22px rgba(72,56,142,.08)" };

  return (
    <div className="space-y-5">
      <Link href="/admin/usuarios" className="text-[13px]" style={{ color: C.muted }}>← Volver a usuarios</Link>

      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl tracking-[-0.02em]" style={{ fontFamily: C.po, fontWeight: 800 }}>
          {user.full_name ?? user.email}
        </h1>
        <PlanBadge plan={user.plan} />
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <div className="rounded-2xl p-5" style={card}>
            <h2 className="text-[15px] mb-3" style={{ fontFamily: C.po, fontWeight: 700 }}>Datos</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              {rows.map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-3 py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <dt style={{ color: C.muted }}>{k}</dt>
                  <dd className="font-semibold text-right truncate">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 text-[11.5px]" style={{ color: C.muted }}>
              <span className="font-semibold">Adquisición:</span> {utm}
            </div>
          </div>

          {/* Línea de tiempo del funnel */}
          <div className="rounded-2xl p-5" style={card}>
            <h2 className="text-[15px] mb-3" style={{ fontFamily: C.po, fontWeight: 700 }}>
              Recorrido en el funnel ({funnelEvents.length})
            </h2>
            {funnelEvents.length === 0 ? (
              <div className="text-[12.5px]" style={{ color: C.muted }}>Sin eventos registrados.</div>
            ) : (
              <ol className="space-y-2">
                {funnelEvents.map((e, i) => (
                  <li key={i} className="flex items-center gap-3 text-[12.5px]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.violet }} />
                    <span className="flex-1">
                      {EVENT_LABELS[e.event] ?? e.event}
                      {e.step && <span style={{ color: C.muted }}> · {e.step}</span>}
                    </span>
                    <span className="whitespace-nowrap" style={{ color: C.muted }}>{fmtDate(e.created_at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-2xl p-5" style={card}>
            <h2 className="text-[15px] mb-3" style={{ fontFamily: C.po, fontWeight: 700 }}>
              Últimas generaciones ({outputs.length})
            </h2>
            {outputs.length === 0 ? (
              <div className="text-[12.5px]" style={{ color: C.muted }}>Todavía no generó nada.</div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left" style={{ color: C.muted }}>
                    <th className="font-semibold pb-1.5">Tipo</th>
                    <th className="font-semibold pb-1.5">Modelo</th>
                    <th className="font-semibold pb-1.5 text-right">Tokens</th>
                    <th className="font-semibold pb-1.5 text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {outputs.map((o, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="py-1.5 capitalize">{o.kind}</td>
                      <td className="py-1.5 truncate max-w-[120px]">{(o.model ?? "").replace("claude-", "")}</td>
                      <td className="py-1.5 text-right">{fmtInt((o.input_tokens ?? 0) + (o.output_tokens ?? 0))}</td>
                      <td className="py-1.5 text-right whitespace-nowrap" style={{ color: C.muted }}>
                        {new Date(o.created_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {payments.length > 0 && (
            <div className="rounded-2xl p-5" style={card}>
              <h2 className="text-[15px] mb-3" style={{ fontFamily: C.po, fontWeight: 700 }}>Pagos ({payments.length})</h2>
              <table className="w-full text-[12px]">
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td className="py-1.5">{new Date(p.created_at).toLocaleDateString("es-AR")}</td>
                      <td className="py-1.5 text-right font-semibold">
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
