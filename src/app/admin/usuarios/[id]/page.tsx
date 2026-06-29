import Link from "next/link";
import { notFound } from "next/navigation";
import { getUserDetail } from "@/lib/admin/metrics";
import { ActionsPanel } from "./actions-panel";
import { Panel, PlanBadge, fmtInt } from "../../_components/ui";

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
    ["Generaciones gratis", `${user.free_generations_used} / 3`],
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
  const utm = user.acquisition ? Object.entries(user.acquisition).map(([k, v]) => `${k}=${v}`).join(" · ") : "—";

  return (
    <>
      <header className="adm__head">
        <div>
          <Link href="/admin/usuarios" className="muted" style={{ fontSize: 13 }}>← Usuarios</Link>
          <h1 className="adm__title" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12 }}>
            {user.full_name ?? user.email}
            <PlanBadge plan={user.plan} />
          </h1>
        </div>
      </header>

      <div className="grid2--side grid2">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel title="Datos">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 28px" }}>
              {rows.map(([label, val]) => (
                <div key={String(label)} className="row" style={{ margin: 0, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span className="muted" style={{ fontSize: 13 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13.5, textAlign: "right" }}>{val}</span>
                </div>
              ))}
            </div>
            <p className="panel__hint"><span style={{ color: "var(--ink)", fontWeight: 700 }}>Adquisición:</span> {utm}</p>
          </Panel>

          <Panel title={`Recorrido en el funnel · ${funnelEvents.length}`}>
            {funnelEvents.length === 0 ? (
              <div className="faint" style={{ fontSize: 13.5 }}>Sin eventos registrados.</div>
            ) : (
              <div className="list">
                {funnelEvents.map((e, i) => (
                  <div key={i} className="list__item">
                    <span className="b" />
                    <span style={{ flex: 1 }}>
                      {EVENT_LABELS[e.event] ?? e.event}
                      {e.step && <span className="faint"> · {e.step}</span>}
                    </span>
                    <span className="faint mono" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(e.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Últimas generaciones · ${outputs.length}`}>
            {outputs.length === 0 ? (
              <div className="faint" style={{ fontSize: 13.5 }}>Todavía no generó nada.</div>
            ) : (
              <div className="tbl__scroll">
                <table className="tbl">
                  <thead><tr><th>Tipo</th><th>Modelo</th><th className="num">Tokens</th><th className="num">Fecha</th></tr></thead>
                  <tbody>
                    {outputs.map((o, i) => (
                      <tr key={i}>
                        <td style={{ textTransform: "capitalize" }}>{o.kind}</td>
                        <td>{(o.model ?? "").replace("claude-", "")}</td>
                        <td className="num">{fmtInt((o.input_tokens ?? 0) + (o.output_tokens ?? 0))}</td>
                        <td className="num faint">{new Date(o.created_at).toLocaleDateString("es-AR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {payments.length > 0 && (
            <Panel title={`Pagos · ${payments.length}`}>
              <div className="tbl__scroll">
                <table className="tbl">
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={i}>
                        <td>{new Date(p.created_at).toLocaleDateString("es-AR")}</td>
                        <td className="num" style={{ fontWeight: 700 }}>${Math.round(Number(p.amount)).toLocaleString("es-AR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>

        <ActionsPanel userId={user.id} plan={user.plan} />
      </div>
    </>
  );
}
