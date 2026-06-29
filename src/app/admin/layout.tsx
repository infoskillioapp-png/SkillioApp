import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminEmail } from "@/lib/admin/auth";
import { AutoRefresh } from "./_components/auto-refresh";
import { NavLink } from "./_components/nav-link";

// Panel privado. Guard: solo emails en la allowlist (ADMIN_EMAILS). Cualquier
// otro usuario logueado se va a /app; sin sesión, a /login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await getAdminEmail();
  if (!email) redirect("/app");

  return (
    <div style={{ minHeight: "100vh", width: "100%", background: "#eef0fb", color: "#1f2347", fontFamily: '"Inter",system-ui,sans-serif' }}>
      <header
        className="sticky top-0 z-30"
        style={{ borderBottom: "1px solid #e7e9f5", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)" }}
      >
        <div className="w-full flex items-center gap-5 px-6 py-3">
          <Link
            href="/admin"
            className="text-lg tracking-[-0.03em]"
            style={{ fontFamily: '"Poppins",system-ui,sans-serif', fontWeight: 800 }}
          >
            Skill<span style={{ color: "#8b5cf6" }}>io</span>
            <span className="ml-2 text-[10px] font-bold uppercase align-middle" style={{ letterSpacing: "0.18em", color: "#aab2c8" }}>
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px] font-semibold">
            <NavLink href="/admin" label="Resumen" />
            <NavLink href="/admin/usuarios" label="Usuarios" />
            <NavLink href="/admin/pagos" label="Pagos" />
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[12px]" style={{ color: "#8487a6" }}>
            <span className="hidden sm:inline">{email}</span>
            <Link
              href="/app"
              className="px-3 py-1.5 rounded-full transition"
              style={{ border: "1px solid #e7e9f5" }}
            >
              ← App
            </Link>
          </div>
        </div>
      </header>
      <main className="w-full px-6 py-6">{children}</main>
      <AutoRefresh seconds={60} />
    </div>
  );
}
