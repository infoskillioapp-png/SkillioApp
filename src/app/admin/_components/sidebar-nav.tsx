"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const items = [
  { href: "/admin", label: "Resumen", icon: IconGrid, exact: true },
  { href: "/admin/embudo", label: "Embudo", icon: IconFunnel },
  { href: "/admin/tour", label: "Tour guiado", icon: IconRoute },
  { href: "/admin/usuarios", label: "Usuarios", icon: IconUsers },
  { href: "/admin/pagos", label: "Pagos", icon: IconCard },
];

export function SidebarNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Conservar el rango de fechas al saltar entre secciones que lo usan
  const q = params.get("from") && params.get("to") ? `?from=${params.get("from")}&to=${params.get("to")}` : "";

  return (
    <nav className="adm__nav">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const keepRange = it.href === "/admin" || it.href === "/admin/embudo" || it.href === "/admin/tour";
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href + (keepRange ? q : "")}
            className={`adm__navlink${active ? " adm__navlink--active" : ""}`}
          >
            <Icon />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function IconFunnel() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18l-7 8v7l-4 2v-9z" />
    </svg>
  );
}
function IconRoute() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" />
      <path d="M8.5 19H14a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 6.3M18 20a6.5 6.5 0 0 0-3-5.5" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19" />
    </svg>
  );
}
