"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

const PAL = ["#7c3aed", "#8b5cf6", "#4f7dff", "#ffc93c", "#34d399", "#f472b6"];

export function GraciasClient() {
  const layerRef = useRef<HTMLDivElement>(null);

  // Burst de confeti al entrar.
  useEffect(() => {
    const lay = layerRef.current;
    if (!lay) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const pieces: HTMLSpanElement[] = [];
    for (let i = 0; i < 60; i++) {
      const p = document.createElement("span");
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const dur = 2.2 + Math.random() * 1.4;
      p.style.cssText = `position:absolute;top:-16px;left:${left}%;width:9px;height:14px;border-radius:2px;background:${PAL[i % PAL.length]};opacity:.95;transform:rotate(${Math.random() * 360}deg);animation:gfall ${dur}s ${delay}s cubic-bezier(.3,.6,.5,1) forwards`;
      lay.appendChild(p);
      pieces.push(p);
    }
    const t = setTimeout(() => pieces.forEach((p) => p.remove()), 4200);
    return () => { clearTimeout(t); pieces.forEach((p) => p.remove()); };
  }, []);

  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 18px", background: "radial-gradient(1000px 520px at 50% -10%, rgba(139,92,246,.18), transparent 60%), var(--bg,#f6f5fb)" }}>
      <div ref={layerRef} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }} />
      <style>{`
        @keyframes gfall{to{transform:translateY(105vh) rotate(720deg);opacity:0}}
        @keyframes gpop{from{opacity:0;transform:translateY(14px) scale(.94)}to{opacity:1;transform:none}}
        @keyframes gfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      `}</style>

      <div style={{ position: "relative", width: "min(440px,100%)", background: "#fff", borderRadius: 26, padding: "34px 28px 28px", textAlign: "center", boxShadow: "0 28px 70px rgba(40,30,90,.22)", border: "1px solid #ece7fb", animation: "gpop .4s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ width: 108, height: 108, margin: "0 auto 6px", animation: "gfloat 4s ease-in-out infinite" }}>
          <Image src="/booki-3.png" alt="Booki" width={108} height={108} style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 10px 22px rgba(124,58,237,.4))" }} />
        </div>

        <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#7c3aed", background: "rgba(124,58,237,.10)", borderRadius: 999, padding: "5px 12px", marginBottom: 12 }}>
          🎉 SUSCRIPCIÓN ACTIVA
        </div>

        <h1 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em", color: "var(--ink,#1f2347)", margin: "0 0 8px" }}>
          ¡Ya sos PRO!
        </h1>
        <p style={{ fontSize: 14.5, color: "var(--muted,#5b6178)", lineHeight: 1.55, margin: "0 0 20px" }}>
          Tu pago se acreditó y desbloqueaste todo Skillio <b>sin límites</b>. Te mandamos un mail con los detalles de tu suscripción.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "left", background: "#faf9ff", border: "1px solid rgba(139,92,246,.14)", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          {["Resúmenes, tarjetas, simulacros y juegos sin límites", "El modelo de IA de máxima calidad", "Todos tus apuntes, sin cortes"].map((f) => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#3b3558" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M20 6 9 17l-5-5" /></svg>
              {f}
            </div>
          ))}
        </div>

        <Link href="/app" style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "15px", borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 15.5, textDecoration: "none", boxShadow: "0 12px 26px rgba(124,58,237,.32)" }}>
          Empezar a estudiar →
        </Link>
      </div>
    </main>
  );
}
