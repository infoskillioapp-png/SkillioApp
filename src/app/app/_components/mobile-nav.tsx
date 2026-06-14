"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/app",
    label: "Inicio",
    exact: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M3 11L12 3l9 8" /><path d="M5 9.5V20h5v-5h4v5h5V9.5" />
      </svg>
    ),
  },
  {
    href: "/app/agenda",
    label: "Agenda",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-5 h-5">
        <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/app/materias",
    label: "Materias",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-5 h-5">
        <path d="M4 5.5a2 2 0 0 1 2-2h11.5v15H6a2 2 0 0 0-2 2v-15z" /><path d="M8 7.5h7M8 11h5" />
      </svg>
    ),
  },
  {
    href: "/app/apuntes",
    label: "Apuntes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="w-5 h-5">
        <path d="M6 3.5h9l4 4v13H6z" /><path d="M15 3.5v4h4M9 12h6M9 15.5h6" />
      </svg>
    ),
  },
  {
    href: "/app/comunidad",
    label: "Comunidad",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" /><path d="M21 20c0-2.8-1.8-5.1-4.3-5.8" />
      </svg>
    ),
  },
  {
    href: "/app/ia",
    label: "Aprobá IA",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 3.5l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5L5.5 10l4.5-2z" />
        <path d="M18.5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" />
      </svg>
    ),
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-rule bg-bg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="flex items-stretch overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[64px] transition-colors",
                active ? "text-accent" : "text-ink-softer"
              )}
            >
              {item.icon}
              <span className="text-[9.5px] font-semibold leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
