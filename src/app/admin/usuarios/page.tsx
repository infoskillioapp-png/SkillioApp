import Link from "next/link";
import { listUsers } from "@/lib/admin/metrics";
import { PlanBadge, C } from "../_components/ui";

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-AR");
}

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const users = await listUsers(q, 200);

  return (
    <div className="space-y-4">
      <form className="flex gap-2" action="/admin/usuarios" method="get">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por email, nombre o carrera…"
          className="flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none"
          style={{ border: `1px solid ${C.line}`, background: C.card }}
        />
        <button
          className="px-5 py-2.5 rounded-full text-white text-sm"
          style={{ fontFamily: C.po, fontWeight: 600, background: `linear-gradient(135deg,${C.violet},${C.blue})` }}
        >
          Buscar
        </button>
      </form>

      <div className="text-[12px]" style={{ color: C.muted }}>
        {users.length} usuarios{q ? ` para "${q}"` : ""}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.line}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[820px]">
            <thead>
              <tr className="text-left" style={{ color: C.muted, background: C.line2 }}>
                <th className="font-semibold px-4 py-2.5">Usuario</th>
                <th className="font-semibold px-2 py-2.5">Plan</th>
                <th className="font-semibold px-2 py-2.5 text-right">Créditos / Gratis</th>
                <th className="font-semibold px-2 py-2.5">Estado</th>
                <th className="font-semibold px-2 py-2.5">Fuente</th>
                <th className="font-semibold px-2 py-2.5">Alta</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: `1px solid ${C.line}` }}>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold truncate max-w-[220px]">{u.full_name ?? "—"}</div>
                    <div className="truncate max-w-[220px]" style={{ color: C.muted }}>{u.email}</div>
                  </td>
                  <td className="px-2 py-2.5"><PlanBadge plan={u.plan} /></td>
                  <td className="px-2 py-2.5 text-right">
                    {u.plan === "free" ? `${u.free_generations_used}/3 gratis` : `${u.credits} créd.`}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1.5 items-center">
                      {u.activated_at && <Dot label="Activado" tone={C.green} />}
                      {!u.onboarding_completed && <Dot label="Sin onboarding" tone={C.amber} />}
                      {u.expires_at && new Date(u.expires_at) < new Date() && <Dot label="Vencido" tone={C.red} />}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 truncate max-w-[110px]" style={{ color: C.muted }}>
                    {u.acquisition?.utm_source ?? "—"}
                  </td>
                  <td className="px-2 py-2.5 whitespace-nowrap" style={{ color: C.muted }}>{timeAgo(u.created_at)}</td>
                  <td className="px-2 py-2.5 text-right">
                    <Link href={`/admin/usuarios/${u.id}`} className="font-semibold whitespace-nowrap" style={{ color: C.violet }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Dot({ label, tone }: { label: string; tone: string }) {
  return <span title={label} className="inline-block w-2 h-2 rounded-full" style={{ background: tone }} />;
}
