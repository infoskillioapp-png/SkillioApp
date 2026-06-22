"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/app", tip: "Inicio", img: "/bookilogo_t.png", alt: "Inicio", brand: true },
  { href: "/app/ia", tip: "Subir apunte", img: "/signomas_t.png", alt: "Subir apunte", upload: true },
  { href: "/app/materias", tip: "Mis materias", img: "/mismaterias_t.png", alt: "Mis materias" },
  { href: "/app/logros", tip: "Logros", img: "/Logros_t.png", alt: "Logros" },
  { href: "/app/comunidad", tip: "Comunidad", img: "/comunidad_t.png", alt: "Comunidad" },
];

export function Sidebar({ initial }: { initial: string }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      {NAV.map((item) => {
        const isActive = item.href === "/app"
          ? pathname === "/app"
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
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
