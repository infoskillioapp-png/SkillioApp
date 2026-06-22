"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SkillioUser } from "@/lib/sync-user";

export function Sidebar({ user }: { user: SkillioUser }) {
  const pathname = usePathname();

  const initials =
    user.full_name
      ?.split(" ")
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? user.email.slice(0, 2).toUpperCase();

  const isHome = pathname === "/app";
  const isIa = pathname.startsWith("/app/ia");
  const isMaterias = pathname.startsWith("/app/materias");
  const isLogros = pathname.startsWith("/app/logros");
  const isComunidad = pathname.startsWith("/app/comunidad");

  return (
    <nav className="sidebar">
      <Link
        className={`sbtn brand${isHome ? " active" : ""}`}
        href="/app"
        data-tip="Inicio"
      >
        <img src="/bookilogo_t.png" alt="Inicio" />
      </Link>

      <Link
        className={`sbtn${isIa ? " active" : ""}`}
        href="/app/ia"
        data-tip="Subir apunte"
      >
        <img src="/signomas_t.png" alt="Subir apunte" />
      </Link>

      <Link
        className={`sbtn${isMaterias ? " active" : ""}`}
        href="/app/materias"
        data-tip="Mis materias"
      >
        <img src="/mismaterias_t.png" alt="Mis materias" />
      </Link>

      <Link
        className={`sbtn${isLogros ? " active" : ""}`}
        href="/app/logros"
        data-tip="Logros"
      >
        <img src="/Logros_t.png" alt="Logros" />
      </Link>

      <Link
        className={`sbtn${isComunidad ? " active" : ""}`}
        href="/app/comunidad"
        data-tip="Comunidad"
      >
        <img src="/comunidad_t.png" alt="Comunidad" />
      </Link>

      <Link className="sbtn me" href="/app/perfil" data-tip="Tu perfil">
        {initials}
      </Link>
    </nav>
  );
}
