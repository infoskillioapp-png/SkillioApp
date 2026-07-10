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

// Para el invitado (registro diferido) mostramos sólo lo del embudo: Inicio y
// Subir apunte. Las demás secciones requieren cuenta (el middleware igual las
// bloquea), así que en vez del perfil ponemos un acceso a crear cuenta.
const GUEST_NAV = NAV.slice(0, 2);

export function Sidebar({ initial, isGuest = false }: { initial?: string; isGuest?: boolean }) {
  const pathname = usePathname();
  const items = isGuest ? GUEST_NAV : NAV;

  return (
    <nav className="sidebar">
      {items.map((item) => {
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
      {isGuest ? (
        <Link href="/login" className="sbtn me" data-tip="Creá tu cuenta" style={{ fontSize: 20 }}>
          ✨
        </Link>
      ) : (
        <Link href="/app/perfil" className="sbtn me" data-tip="Tu perfil">
          {initial}
        </Link>
      )}
    </nav>
  );
}
