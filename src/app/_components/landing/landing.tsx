"use client";

import "./landing.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar, HeroText, IconArrow, CTAMicro } from "./landing-top";
import { HowItWorks } from "./landing-mid";
import { Pricing, FAQ, FinalCTA, Footer, Testimonios } from "./landing-bottom";
import MeshBackground from "./MeshBackground";

// ============================================================
// CUSTOM CURSOR — solo desktop (pointer: fine)
// ============================================================
function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -120, y: -120 });
  const ringPos = useRef({ x: -120, y: -120 });
  const bigRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setVisible(true);

    const onMove = (e: MouseEvent) => { posRef.current = { x: e.clientX, y: e.clientY }; };
    document.addEventListener("mousemove", onMove);

    const INTERACTIVE = "a, button, [role=button], input, select, textarea";
    const onEnter = (e: MouseEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest(INTERACTIVE)) bigRef.current = true;
    };
    const onLeave = (e: MouseEvent) => {
      const t = e.target;
      if (t instanceof Element && t.closest(INTERACTIVE)) bigRef.current = false;
    };
    document.addEventListener("mouseenter", onEnter, true);
    document.addEventListener("mouseleave", onLeave, true);

    let raf: number;
    const animate = () => {
      ringPos.current.x += (posRef.current.x - ringPos.current.x) * 0.10;
      ringPos.current.y += (posRef.current.y - ringPos.current.y) * 0.10;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${posRef.current.x - 5}px, ${posRef.current.y - 5}px)`;
      }
      if (ringRef.current) {
        const r = bigRef.current ? 22 : 14;
        ringRef.current.style.transform = `translate(${ringPos.current.x - r}px, ${ringPos.current.y - r}px)`;
        ringRef.current.style.width = `${r * 2}px`;
        ringRef.current.style.height = `${r * 2}px`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseenter", onEnter, true);
      document.removeEventListener("mouseleave", onLeave, true);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!visible) return null;
  return (
    <>
      <div ref={dotRef} aria-hidden style={{ position: "fixed", top: 0, left: 0, zIndex: 9999, pointerEvents: "none", width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", willChange: "transform" }} />
      <div ref={ringRef} aria-hidden style={{ position: "fixed", top: 0, left: 0, zIndex: 9998, pointerEvents: "none", width: 28, height: 28, borderRadius: "50%", border: "1.5px solid var(--accent)", opacity: 0.45, willChange: "transform, width, height", transition: "width 180ms ease, height 180ms ease" }} />
      <style>{`.hero-wrapper * { cursor: none !important; }`}</style>
    </>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("revealed"); obs.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function CTAPost({ onCTA }: { onCTA: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 24px 52px" }}>
      <button className="btn btn-primary btn-lg btn-pulse" onClick={onCTA} style={{ fontSize: 17 }}>
        Empezá gratis <IconArrow size={18} />
      </button>
      <CTAMicro />
    </div>
  );
}

// Barra CTA fija en mobile — siempre visible mientras scrollea
function StickyMobileCTA({ onCTA }: { onCTA: () => void }) {
  return (
    <div
      id="sticky-cta"
      style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 90,
        background: "rgba(240,237,255,0.94)", backdropFilter: "saturate(140%) blur(10px)",
        borderTop: "1px solid rgba(53,56,49,0.08)", padding: "10px 16px calc(10px + env(safe-area-inset-bottom))",
        boxShadow: "0 -6px 24px -12px rgba(53,56,49,0.25)",
      }}
    >
      <button className="btn btn-primary" onClick={onCTA} style={{ width: "100%", fontSize: 16, padding: "14px 22px" }}>
        Empezá gratis <IconArrow size={16} />
      </button>
      <p style={{ textAlign: "center", margin: "6px 0 0", fontSize: 11.5, color: "var(--ink-softer)" }}>
        Sin tarjeta · Probá PRO · Cancelás cuando quieras
      </p>
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  // Registro diferido: TODOS los CTAs del landing llevan directo a la app
  // (/app?upload=1), sin cuenta: abre el modal de subir apunte. El plan ya no
  // se elige acá — aparece en el paywall, después de ver el resultado. El plan
  // que manda Pricing se ignora a propósito.
  const onCTA = useCallback((_plan?: string) => {
    router.push("/app?upload=1");
  }, [router]);
  useReveal();

  // Forzar light mode en la landing independientemente del tema del dashboard
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.getAttribute("data-theme");
    html.removeAttribute("data-theme");
    return () => {
      if (prev) html.setAttribute("data-theme", prev);
    };
  }, []);

  return (
    <div
      className="hero-wrapper"
      style={{ fontFamily: "var(--font-jakarta)", color: "var(--ink)", colorScheme: "light" }}
    >
      <MeshBackground />
      <div className="hero-content">
        <Navbar onCTA={onCTA} />
        <HeroText onCTA={onCTA} />
        <CTAPost onCTA={onCTA} />
        <HowItWorks />
        <Testimonios />
        {/* Color morph: lavanda → pricing oscuro */}
        <div aria-hidden style={{ height: 64, background: "linear-gradient(to bottom, #E4DEFF, #3B0764)", pointerEvents: "none" }} />
        <Pricing onCTA={onCTA} />
        {/* Color morph: pricing oscuro → FAQ claro */}
        <div aria-hidden style={{ height: 64, background: "linear-gradient(to bottom, #BE185D, #F0EDFF)", pointerEvents: "none" }} />
        <FAQ />
        <FinalCTA onCTA={onCTA} />
        <Footer />
      </div>

      {/* Custom cursor (desktop only) */}
      <CustomCursor />

      {/* CTA sticky solo en mobile */}
      <StickyMobileCTA onCTA={onCTA} />

      {/* Botón flotante de WhatsApp */}
      <a
        id="wa-fab"
        href="https://wa.me/5493517732460"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        style={{
          position: "fixed",
          bottom: "28px",
          right: "28px",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "#25D366",
          color: "#fff",
          borderRadius: "999px",
          padding: "12px 20px 12px 16px",
          fontFamily: "var(--font-jakarta)",
          fontWeight: 700,
          fontSize: "14px",
          textDecoration: "none",
          boxShadow: "0 4px 20px rgba(37,211,102,0.45)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 28px rgba(37,211,102,0.55)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 20px rgba(37,211,102,0.45)";
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span id="wa-label">Soporte</span>
      </a>

      <style>{`
        /* CTA sticky: solo mobile */
        #sticky-cta { display: none; }
        @media (max-width: 720px) {
          #sticky-cta { display: block; }
          /* Mobile: circulo chico, sin texto */
          #wa-fab {
            bottom: 100px !important;
            right: 16px !important;
            width: 42px !important;
            height: 42px !important;
            padding: 0 !important;
            justify-content: center !important;
          }
          #wa-label { display: none; }
        }
      `}</style>
    </div>
  );
}
