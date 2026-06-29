"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Link de la nav del admin con estado activo (resalta la sección actual).
export function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-full transition"
      style={
        active
          ? { background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff" }
          : { color: "#8487a6" }
      }
    >
      {label}
    </Link>
  );
}
