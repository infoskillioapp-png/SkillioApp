import Link from "next/link";
import { listUsers } from "@/lib/admin/metrics";

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
          className="flex-1 px-4 py-2.5 rounded-full border border-rule bg-paper text-sm focus:outline-none focus:border-accent transition"
        />
        <button className="px-5 py-2.5 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-sm hover:bg-accent-hover transition">
          Buscar
        </button>
      </form>

      <div className="text-[12px] text-ink-soft">{users.length} usuarios{q ? ` para "${q}"` : ""}</div>

      <div className="rounded-2xl border border-rule-soft bg-paper overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[760px]">
            <thead>
              <tr className="text-ink-soft text-left bg-paper-warm">
                <th className="font-semibold px-4 py-2.5">Usuario</th>
                <th className="font-semibold px-2 py-2.5">Plan</th>
                <th className="font-semibold px-2 py-2.5 text-right">Créditos</th>
                <th className="font-semibold px-2 py-2.5">Estado</th>
                <th className="font-semibold px-2 py-2.5">Fuente</th>
                <th className="font-semibold px-2 py-2.5">Alta</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-rule-soft hover:bg-paper-warm transition">
                  <td className="px-4 py-2.5">
                    <div className="font-semibold truncate max-w-[220px]">{u.full_name ?? "—"}</div>
                    <div className="text-ink-soft truncate max-w-[220px]">{u.email}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                        u.plan === "pro" ? "bg-accent text-[#FBF1EF]" : "bg-paper-warm text-ink-soft"
                      }`}
                    >
                      {u.plan === "pro" ? "PRO" : "Free"}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right num">
                    {u.plan === "pro" ? u.credits : `${u.free_generations_used}/3`}
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex gap-1">
                      {u.activated_at && <Dot label="Activado" tone="var(--success)" />}
                      {u.demo_completed && <Dot label="Demo" tone="var(--accent)" />}
                      {!u.onboarding_completed && <Dot label="Sin onboarding" tone="var(--warning)" />}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-ink-soft truncate max-w-[110px]">
                    {u.acquisition?.utm_source ?? "—"}
                  </td>
                  <td className="px-2 py-2.5 text-ink-soft whitespace-nowrap">{timeAgo(u.created_at)}</td>
                  <td className="px-2 py-2.5 text-right">
                    <Link href={`/admin/usuarios/${u.id}`} className="text-accent font-semibold whitespace-nowrap">
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
  return (
    <span
      title={label}
      className="inline-block w-2 h-2 rounded-full"
      style={{ background: tone }}
    />
  );
}
