"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/app", tip: "Inicio", img: "/bookilogo_t.png", alt: "Inicio", brand: true },
  { href: "/app?upload=1", tip: "Subir apunte", img: "/signomas_t.png", alt: "Subir apunte", matchPath: "/app" },
  { href: "/app/materias", tip: "Mis materias", img: "/mismaterias_t.png", alt: "Mis materias" },
  { href: "/app/logros", tip: "Logros", img: "/Logros_t.png", alt: "Logros" },
  { href: "/app/comunidad", tip: "Comunidad", img: "/comunidad_t.png", alt: "Comunidad" },
];

export function Sidebar({ initial }: { initial: string }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      {NAV.map((item) => {
        const checkPath = item.matchPath ?? item.href;
        const isActive = checkPath === "/app"
          ? pathname === "/app"
          : pathname.startsWith(checkPath);
        return (
          <Link
            key={item.tip}
            href={item.href}
            className={`sbtn${item.brand ? " brand" : ""}${isActive ? " active" : ""}`}
            data-tip={item.tip}
          >
            <Image src={item.img} alt={item.alt} width={42} height={42} />
          </Link>
        );
      })}
      <Link href="/app/perfil" className="sbtn me" data-tip="Tu perfil">
        {initial}
      </Link>
    </nav>
  );
}
