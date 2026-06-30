import Link from "next/link";
import { listUsers } from "@/lib/admin/metrics";
import { PlanBadge, fmtDate } from "../_components/ui";

// Teléfono copiable + link a WhatsApp (wa.me necesita solo dígitos).
function PhoneCell({ phone }: { phone: string | null }) {
  if (!phone) return <span className="faint">—</span>;
  const digits = phone.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="mono"
      style={{ fontSize: 13, color: "var(--ink)" }}
      title="Abrir en WhatsApp"
    >
      {phone}
    </a>
  );
}

export const dynamic = "force-dynamic";

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "hoy";
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d}d`;
  return fmtDate(iso);
}

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await listUsers(q, 200);

  return (
    <>
      <header className="adm__head">
        <div>
          <h1 className="adm__title">Usuarios</h1>
          <p className="adm__sub">{users.length} resultados{q ? ` para "${q}"` : ""}</p>
        </div>
        <form className="range" action="/admin/usuarios" method="get">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar email, nombre o carrera…"
            className="range__date"
            style={{ fontFamily: "var(--sans)", minWidth: 240, padding: "9px 13px" }}
          />
          <button className="range__apply" type="submit">Buscar</button>
        </form>
      </header>

      <div className="panel" style={{ padding: "8px 26px" }}>
        <div className="tbl__scroll">
          <table className="tbl" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th>Usuario</th><th>Teléfono</th><th>Plan</th><th className="num">Créditos</th>
                <th>Estado</th><th>Fuente</th><th className="num">Alta</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="is-link">
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.full_name ?? "—"}</div>
                    <div className="faint" style={{ fontSize: 12.5 }}>{u.email}</div>
                  </td>
                  <td><PhoneCell phone={u.phone} /></td>
                  <td><PlanBadge plan={u.plan} /></td>
                  <td className="num">{u.plan === "free" ? `${u.free_generations_used}/3` : u.credits}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {u.activated_at && <span className="dot-state" title="Activado" style={{ background: "var(--green)" }} />}
                      {!u.onboarding_completed && <span className="dot-state" title="Sin onboarding" style={{ background: "var(--amber)" }} />}
                      {u.expires_at && new Date(u.expires_at) < new Date() && <span className="dot-state" title="Vencido" style={{ background: "var(--red)" }} />}
                    </div>
                  </td>
                  <td className="faint" style={{ fontSize: 13 }}>{u.acquisition?.utm_source ?? "—"}</td>
                  <td className="num faint" style={{ whiteSpace: "nowrap" }}>{timeAgo(u.created_at)}</td>
                  <td className="num">
                    <Link href={`/admin/usuarios/${u.id}`} style={{ color: "var(--violet)", fontWeight: 700 }}>Ver →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
