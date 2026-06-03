"use client";

import "./landing.css";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar, HeroText, LogoStrip } from "./landing-top";
import { IconArrow } from "./landing-top";
import { Features, HowItWorks, Demo, Toolkit } from "./landing-mid";
import { Community, Pricing, FAQ, FinalCTA, Footer } from "./landing-bottom";
import MeshBackground from "./MeshBackground";

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
    <div style={{ textAlign: "center", padding: "8px 24px 52px" }}>
      <button className="btn btn-primary btn-lg btn-pulse" onClick={onCTA}>
        Empezá PRO Gratis · 24h <IconArrow size={16} />
      </button>
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const onCTA = useCallback(() => router.push("/registro?plan=pro"), [router]);
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
        <Features />
        <HowItWorks />
        <Demo />
        <CTAPost onCTA={onCTA} />
        <Toolkit />
        <Community onCTA={onCTA} />
        <Pricing onCTA={onCTA} />
        <FAQ />
        <FinalCTA onCTA={onCTA} />
        <LogoStrip />
        <Footer />
      </div>

      {/* Botón flotante de WhatsApp */}
      <a
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
        Soporte
      </a>
    </div>
  );
}
