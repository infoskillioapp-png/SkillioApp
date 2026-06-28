"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SalePopup } from "@/components/sale-popup";
import { OnboardingTour, useTourRequired, TourIconBolt } from "../../../_components/onboarding-tour";

const PAL = ["#4f7dff","#8b5cf6","#ff6b81","#ffc93c","#34d399","#f472b6","#2dd4bf"];
const FREE_LIMIT = 3; // tarjetas interactivas; la 4ta se muestra blureada

function confettiBurst(x: number, y: number) {
  const lay = document.getElementById("confetti-layer");
  if (!lay) return;
  for (let i = 0; i < 34; i++) {
    const p = document.createElement("span");
    p.style.cssText = `position:absolute;width:9px;height:14px;border-radius:2px;left:${x}px;top:${y}px;background:${PAL[i % PAL.length]};--dx:${Math.random() * 240 - 120}px;transform:rotate(${Math.random() * 360}deg);animation:cftFall ${0.8 + Math.random() * 0.7}s ease-out forwards`;
    lay.appendChild(p);
    setTimeout(() => p.remove(), 1700);
  }
}

export type Flashcard = {
  front: string;
  back: string;
  category?: string;
};

export type TarjetasData = {
  noteId: string;
  noteTitle: string;
  subjectName: string;
  flashcards: Flashcard[];
};

// ---- ring animado para resultado ----
function ResultRing({ pct }: { pct: number }) {
  const ringRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<SVGTextElement>(null);
  const RC = 2 * Math.PI * 62;

  useEffect(() => {
    const ring = ringRef.current;
    const text = textRef.current;
    if (!ring || !text) return;
    ring.style.strokeDasharray = String(RC);
    ring.style.strokeDashoffset = String(RC);
    const t = setTimeout(() => {
      ring.style.transition = "stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)";
      ring.style.strokeDashoffset = String(RC - (pct / 100) * RC);
      const start = performance.now();
      const dur = 1200;
      (function tick(now) {
        const p = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        text.textContent = Math.round(pct * e) + "%";
        if (p < 1) requestAnimationFrame(tick);
      })(performance.now());
    }, 250);
    return () => clearTimeout(t);
  }, [pct, RC]);

  return (
    <svg width="138" height="138" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r="62" fill="none" stroke="#eceefb" strokeWidth="14" />
      <circle ref={ringRef} cx="75" cy="75" r="62" fill="none" stroke="url(#gtar)" strokeWidth="14" strokeLinecap="round" style={{ transform: "rotate(-90deg)", transformOrigin: "75px 75px" }} />
      <defs>
        <linearGradient id="gtar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4f7dff" />
        </linearGradient>
      </defs>
      <text ref={textRef} x="75" y="80" textAnchor="middle" fontFamily="Poppins" fontWeight="800" fontSize="30" fill="#1f2347">0%</text>
      <text x="75" y="100" textAnchor="middle" fontFamily="Inter" fontSize="11" fill="#8487a6">dominadas</text>
    </svg>
  );
}

// ---- pantalla de lock ----
function LockedScreen({
  lockedCount,
  onUnlock,
  onFinish,
  stats,
  noteId,
}: {
  lockedCount: number;
  onUnlock: () => void;
  onFinish: () => void;
  stats: { yes: number; mid: number; no: number };
  noteId: string;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "60vh",
      padding: "32px 20px", textAlign: "center",
      gap: 14,
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 24,
        background: "linear-gradient(135deg,#8b5cf6,#6d3bf2)",
        display: "grid", placeItems: "center", fontSize: 38, marginBottom: 4,
      }}>🔒</div>
      <h2 style={{ fontFamily: "var(--po)", fontWeight: 800, fontSize: 22, color: "var(--ink)" }}>
        {lockedCount} tarjeta{lockedCount !== 1 ? "s" : ""} más esperan
      </h2>
      <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6, maxWidth: "30ch", margin: "0 auto" }}>
        Terminaste las 3 tarjetas del plan gratuito. Actualizá para ver el mazo completo.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <button
          onClick={onUnlock}
          style={{
            padding: "12px 22px", borderRadius: 14,
            background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
            color: "#fff", border: "none",
            fontFamily: "var(--po)", fontWeight: 700, fontSize: 14,
            cursor: "pointer", boxShadow: "0 10px 24px rgba(99,38,210,.28)",
          }}
        >
          ⚡ Desbloquear tarjetas
        </button>
        <button
          onClick={onFinish}
          style={{
            padding: "12px 22px", borderRadius: 14,
            background: "#f3f4fb", color: "var(--muted)",
            border: "none", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}
        >
          Ver mi resultado
        </button>
      </div>
      <Link href={`/app/ia?note_id=${noteId}`} style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
        Volver al espacio →
      </Link>
    </div>
  );
}

// ---- main ----
export function TarjetasClient({ data, isPro }: { data: TarjetasData; isPro: boolean }) {
  const allCards = data.flashcards;
  const interactiveCards = isPro ? allCards : allCards.slice(0, FREE_LIMIT);
  const blurCard = !isPro && allCards.length > FREE_LIMIT ? allCards[FREE_LIMIT] : null;
  const visibleCards = interactiveCards;
  const lockedCount = isPro ? 0 : Math.max(0, allCards.length - FREE_LIMIT);

  const [cards, setCards] = useState(visibleCards);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [stats, setStats] = useState({ no: 0, mid: 0, yes: 0 });
  const [phase, setPhase] = useState<"session" | "blur_preview" | "locked" | "result">("session");
  const [resultData, setResultData] = useState({ pct: 0, yes: 0, mid: 0, no: 0, total: 0 });
  const [showPaywall, setShowPaywall] = useState(false);
  const showTarjetasTour = useTourRequired("skillio_tarjetas_tour_v1");
  const rstatRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)];

  const N = cards.length;
  const current = cards[idx];
  const progress = N > 0 ? (idx / N) * 100 : 0;

  function advance() {
    setAnimating(true);
    setFlipped(false);
    setTimeout(() => {
      setIdx((i) => i + 1);
      setAnimating(false);
    }, 60);
  }

  function rate(r: "no" | "mid" | "yes") {
    const newStats = { ...stats, [r]: stats[r] + 1 };
    setStats(newStats);
    if (idx < N - 1) {
      advance();
    } else {
      // Terminó las interactivas: si hay blur card la muestra, si no va al resultado
      if (!isPro && blurCard) {
        setPhase("blur_preview");
      } else if (!isPro && lockedCount > 0) {
        setPhase("locked");
      } else {
        finish(newStats);
      }
    }
  }

  function finish(finalStats: typeof stats) {
    const total = N;
    const yes = finalStats.yes;
    const pct = Math.round((yes / total) * 100);
    setResultData({ pct, yes, mid: finalStats.mid, no: finalStats.no, total });
    setPhase("result");
    const exito = pct > 50;
    if (exito) {
      setTimeout(() => {
        confettiBurst(window.innerWidth / 2, 150);
        setTimeout(() => confettiBurst(window.innerWidth * 0.35, 200), 250);
      }, 500);
    }
    setTimeout(() => {
      rstatRefs.forEach((ref, i) => {
        setTimeout(() => {
          if (ref.current) ref.current.classList.add("in");
        }, i * 130);
      });
    }, 300);
  }

  function restart() {
    setCards(visibleCards);
    setIdx(0);
    setFlipped(false);
    setStats({ no: 0, mid: 0, yes: 0 });
    setPhase("session");
  }

  if (!current && phase === "session") return null;

  const exito = resultData.pct > 50;

  return (
    <>
      <div id="confetti-layer" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 80, overflow: "hidden" }} />

      {showPaywall && <SalePopup ctx="flashcard" onClose={() => setShowPaywall(false)} />}

      {showTarjetasTour && phase === "session" && current && (
        <OnboardingTour
          storageKey="skillio_tarjetas_tour_v1"
          steps={[
            {
              icon: <TourIconBolt />,
              title: "Tocá la tarjeta para girarla",
              body: "En el frente ves la pregunta, tocás y aparece la respuesta. Después decís si la sabías o no para que Booki aprenda cuáles repasar.",
              target: ".fflash",
              placement: "center",
              nextLabel: "¡Entendido!",
            },
          ]}
        />
      )}

      {/* topbar */}
      <div className="rtopbar">
        <Link href={`/app/ia?note_id=${data.noteId}`} className="back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Volver
        </Link>
        <div className="crumb-r">{data.subjectName} · <b>Tarjetas</b></div>
        {phase === "session" && (
          <div className="rfiles">
            {!isPro && lockedCount > 0 ? `${idx + 1} / ${N} · 🔒 ${lockedCount} más` : `${idx + 1} / ${N}`}
          </div>
        )}
      </div>

      <div className="flash-stage">
        {/* ---- sesión ---- */}
        {phase === "session" && current && (
          <>
            <div className="fprog">
              <div className="bar"><i style={{ width: progress + "%" }} /></div>
              <div className="lab">
                <span>Tarjeta {idx + 1} de {N}{!isPro && lockedCount > 0 ? ` · ${lockedCount} 🔒` : ""}</span>
                <span>{stats.yes} dominadas</span>
              </div>
            </div>

            <div className="fdeck">
              <div
                className={`fflash${flipped ? " flipped" : ""}${animating ? " swap" : ""}`}
                onClick={() => setFlipped((f) => !f)}
              >
                <div className="fface ffront">
                  <div className="feyebrow">{current.category ?? data.noteTitle}</div>
                  <div className="fbig">{current.front}</div>
                  <div className="fhint">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    Tocá para ver la respuesta
                  </div>
                </div>
                <div className="fface fback">
                  <div className="feyebrow">Respuesta</div>
                  <div className="fbig">{current.back}</div>
                  <div className="fhint">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" />
                    </svg>
                    Tocá para volver
                  </div>
                </div>
              </div>
            </div>

            <div className="flip-cta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" />
              </svg>
              ¿Te la sabías? Evaluate para fijar el tema
            </div>

            <div className="rate">
              <button className="rb no" onClick={() => rate("no")}>
                <span className="em">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </span>
                No la sabía
              </button>
              <button className="rb mid" onClick={() => rate("mid")}>
                <span className="em">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M5 12h14" />
                  </svg>
                </span>
                Más o menos
              </button>
              <button className="rb yes" onClick={() => rate("yes")}>
                <span className="em">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                ¡La sabía!
              </button>
            </div>
          </>
        )}

        {/* ---- blur preview (4ta tarjeta bloqueada) ---- */}
        {phase === "blur_preview" && blurCard && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px", gap: 16 }}>
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", maxWidth: "30ch" }}>
              Acá hay una tarjeta más esperándote — y muchas más con PRO.
            </p>
            <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
              {/* tarjeta blureada */}
              <div style={{ filter: "blur(5px)", pointerEvents: "none", userSelect: "none" }}>
                <div className="fflash" style={{ background: "#fff", borderRadius: 22, padding: "28px 24px", boxShadow: "0 4px 24px rgba(0,0,0,.10)" }}>
                  <div className="feyebrow" style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{blurCard.category ?? data.noteTitle}</div>
                  <div className="fbig" style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4 }}>{blurCard.front}</div>
                </div>
              </div>
              {/* overlay paywall */}
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
                borderRadius: 22, background: "rgba(255,255,255,.55)", backdropFilter: "blur(2px)",
              }}>
                <div style={{ fontSize: 28 }}>🔒</div>
                <button
                  onClick={() => setShowPaywall(true)}
                  style={{
                    padding: "11px 22px", borderRadius: 13,
                    background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                    color: "#fff", border: "none",
                    fontFamily: "var(--po)", fontWeight: 700, fontSize: 14,
                    cursor: "pointer", boxShadow: "0 8px 20px rgba(99,38,210,.28)",
                  }}
                >
                  ⚡ Desbloquear tarjetas
                </button>
              </div>
            </div>
            <button
              onClick={() => finish(stats)}
              style={{ fontSize: 13, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Ver mi resultado →
            </button>
          </div>
        )}

        {/* ---- locked ---- */}
        {phase === "locked" && (
          <LockedScreen
            lockedCount={lockedCount}
            onUnlock={() => setShowPaywall(true)}
            onFinish={() => finish(stats)}
            stats={stats}
            noteId={data.noteId}
          />
        )}

        {/* ---- resultado ---- */}
        {phase === "result" && (
          <div className="fresult show">
            <div className="rscene" style={{ backgroundImage: `url(${exito ? "/fondo_exito.png" : "/fondo_fracaso.png"})` }}>
              <div className="cap">
                <h2>{exito ? "¡Excelente repaso!" : "¡A seguir repasando!"}</h2>
                <p>{exito ? "¡Vas dominando el tema! Seguí así." : "Repasá las que te costaron; con otra vuelta las dominás."}</p>
              </div>
            </div>
            <div className="rcard2">
              <div className="result-ring">
                <ResultRing pct={resultData.pct} />
              </div>
              <div className="rstats2">
                <div ref={rstatRefs[0]} className="rstat2" style={{ "--ac": "#10b981" } as React.CSSProperties}>
                  <b style={{ color: "#10b981" }}>{resultData.yes}</b>
                  <span>¡Las sabía!</span>
                </div>
                <div ref={rstatRefs[1]} className="rstat2" style={{ "--ac": "var(--amber)" } as React.CSSProperties}>
                  <b style={{ color: "var(--amber)" }}>{resultData.mid}</b>
                  <span>Más o menos</span>
                </div>
                <div ref={rstatRefs[2]} className="rstat2" style={{ "--ac": "var(--red)" } as React.CSSProperties}>
                  <b style={{ color: "var(--red)" }}>{resultData.no}</b>
                  <span>No las sabía</span>
                </div>
              </div>

              {/* upgrade CTA en resultado para free */}
              {!isPro && lockedCount > 0 && (
                <div style={{
                  border: "1.5px solid rgba(139,92,246,.2)",
                  borderRadius: 18, marginBottom: 14, overflow: "hidden",
                }}>
                  <div style={{ position: "relative", width: "100%", height: 140 }}>
                    <Image
                      src="/paywalls/upsell.jpeg"
                      alt=""
                      fill
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ padding: "14px 16px 16px", background: "linear-gradient(135deg,rgba(139,92,246,.06),rgba(79,125,255,.06))" }}>
                    <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, marginBottom: 5 }}>
                      🔒 {lockedCount} tarjeta{lockedCount !== 1 ? "s" : ""} más esperan
                    </div>
                    <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 12 }}>
                      Desbloqueá el mazo completo con PRO y dominá cada concepto.
                    </div>
                    <button
                      onClick={() => setShowPaywall(true)}
                      style={{
                        width: "100%", padding: "11px",
                        background: "linear-gradient(135deg,#8b5cf6,#4f7dff)",
                        color: "#fff", border: "none", borderRadius: 13,
                        fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
                        cursor: "pointer",
                      }}
                    >
                      ⚡ Desbloquear tarjetas
                    </button>
                  </div>
                </div>
              )}

              <div className="rowbtns">
                <button className="nbtn ghost" onClick={restart}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.4 2.6L3 8" /><path d="M3 3v5h5" />
                  </svg>
                  Repasar de nuevo
                </button>
                <Link href={`/app/ia?note_id=${data.noteId}`} className="nbtn">
                  Volver al espacio →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
