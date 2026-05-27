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
    </div>
  );
}
