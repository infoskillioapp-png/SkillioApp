import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminEmail } from "@/lib/admin/auth";
import { AutoRefresh } from "./_components/auto-refresh";
import { SidebarNav } from "./_components/sidebar-nav";
import "./admin.css";

// Consola interna. Guard: solo emails de la allowlist (ADMIN_EMAILS).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await getAdminEmail();
  if (!email) redirect("/app");

  return (
    <div className="adm">
      <div className="adm__shell">
        <aside className="adm__side">
          <Link href="/admin" className="adm__brand">
            Skill<span className="dot">io</span>
            <span className="tag">admin</span>
          </Link>
          <SidebarNav />
          <div className="adm__sidefoot">
            <span className="mono" style={{ fontSize: 11.5 }}>{email}</span>
            <Link href="/app">← Volver a la app</Link>
          </div>
        </aside>

        <main className="adm__main">{children}</main>
      </div>
      <AutoRefresh seconds={90} />
    </div>
  );
}
