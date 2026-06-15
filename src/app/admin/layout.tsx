import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminEmail } from "@/lib/admin/auth";

// Panel privado. Guard: solo emails en la allowlist (ADMIN_EMAILS). Cualquier
// otro usuario logueado se va a /app; sin sesión, a /login.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const email = await getAdminEmail();
  if (!email) redirect("/app");

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="max-w-7xl mx-auto flex items-center gap-5 px-5 py-3">
          <Link href="/admin" className="font-display font-extrabold text-lg tracking-[-0.03em]">
            Skill<span className="text-accent">io</span>
            <span className="ml-2 text-[10px] font-bold uppercase tracking-[0.18em] text-ink-softer align-middle">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-[13px] font-semibold">
            <Link href="/admin" className="px-3 py-1.5 rounded-full hover:bg-paper-warm transition">
              Resumen
            </Link>
            <Link href="/admin/usuarios" className="px-3 py-1.5 rounded-full hover:bg-paper-warm transition">
              Usuarios
            </Link>
            <Link href="/admin/pagos" className="px-3 py-1.5 rounded-full hover:bg-paper-warm transition">
              Pagos
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[12px] text-ink-soft">
            <span className="hidden sm:inline">{email}</span>
            <Link href="/app" className="px-3 py-1.5 rounded-full border border-rule hover:border-accent hover:text-accent transition">
              ← App
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-5 py-6">{children}</main>
    </div>
  );
}
