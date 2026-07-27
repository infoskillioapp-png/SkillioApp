"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { QuickPaywall } from "@/components/quick-paywall";
import { GiftPopup } from "@/components/gift-popup";
import { OnboardingTour, useTourRequired, TourIconBook, TourIconSparkles } from "../../_components/onboarding-tour";

// ---- tipos ----
type Topic = { id: string; name: string; sub: string; pct: number };
type Section = { id: string; name: string; color: string; topics: Topic[] };

type NoteData = {
  id: string;
  title: string;
  subjectName: string;
  summaryCount: number;
  flashcardsCount: number;
  simulacroCount: number;
  sections: Section[];
  fileUrl?: string | null;
};

// ---- paleta de colores ----
const PAL = ["#4f7dff","#8b5cf6","#ff6b81","#ffc93c","#34d399","#f472b6","#2dd4bf"];
const SEC_COLORS = ["#4f7dff","#8b5cf6","#ff6b81","#34d399","#f472b6"];

// ---- mini ring para temas ----
const RC = 2 * Math.PI * 16;

function MiniRing({ pct, color, done }: { pct: number; color: string; done: boolean }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const offset = RC - (pct / 100) * RC;

  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.strokeDashoffset = String(RC);
    const t = setTimeout(() => {
      if (!circleRef.current) return;
      circleRef.current.style.transition = "stroke-dashoffset .7s ease, stroke .3s";
      circleRef.current.style.strokeDashoffset = String(offset);
    }, 100);
    return () => clearTimeout(t);
  }, [offset]);

  return (
    <div className="ring-s" style={{ position: "relative" }}>
      <svg viewBox="0 0 42 42" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
        <circle cx="21" cy="21" r="16" fill="none" stroke="#eef0f8" strokeWidth="4" />
        <circle
          ref={circleRef}
          cx="21" cy="21" r="16" fill="none"
          stroke={done ? "#10b981" : (pct ? color : "#c2c4d8")}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={RC} strokeDashoffset={RC}
        />
      </svg>
      {done ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", inset: 0, margin: "auto" }}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="pcm" style={{ color: pct ? color : "#c2c4d8" }}>{pct}%</span>
      )}
    </div>
  );
}

// ---- big dominio ring ----
function DominioRing({ pct }: { pct: number }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const [display, setDisplay] = useState(0);
  const circumference = 2 * Math.PI * 62;

  useEffect(() => {
    const ring = circleRef.current;
    if (!ring) return;
    ring.style.strokeDasharray = String(circumference);
    ring.style.strokeDashoffset = String(circumference);
    setDisplay(0);
    const t = setTimeout(() => {
      ring.style.transition = "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)";
      ring.style.strokeDashoffset = String(circumference - (pct / 100) * circumference);
      const start = performance.now();
      const dur = 1200;
      function tick(now: number) {
        const p = Math.min((now - start) / dur, 1);
        setDisplay(Math.round(pct * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, 320);
    return () => clearTimeout(t);
  }, [pct, circumference]);

  return (
    <div className="ebigring">
      <svg viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="g1e" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4f7dff" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r="62" fill="none" stroke="#eef0f8" strokeWidth="13" />
        <circle ref={circleRef} cx="75" cy="75" r="62" fill="none" stroke="url(#g1e)" strokeWidth="13" strokeLinecap="round" />
      </svg>
      <div className="ctr">
        <b>{display}%</b>
        <span>Dominio del apunte</span>
      </div>
    </div>
  );
}

// ---- confetti ----
function confettiBurst(x: number, y: number) {
  const lay = document.getElementById("confetti-layer");
  if (!lay) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement("span");
    p.style.cssText = `position:absolute;width:9px;height:14px;border-radius:2px;left:${x}px;top:${y}px;background:${PAL[i % PAL.length]};--dx:${Math.random() * 180 - 90}px;transform:rotate(${Math.random() * 360}deg);animation:cftFall ${0.8 + Math.random() * 0.6}s ease-out forwards`;
    lay.appendChild(p);
    setTimeout(() => p.remove(), 1600);
  }
}

// ---- generating overlay ----
const GEN_STEPS = [
  "Analizando el archivo",
  "Detectando secciones y temas",
  "Armando tu material de estudio",
  "Calculando tu ruta de estudio",
];

// Comportamiento del producto: al subir un apunte se genera SOLO el resumen.
// Tarjetas y simulacro quedan "a demanda" ("Tocá para generar") y se arman —
// cada uno por separado — recién cuando el usuario los toca (ver ModoWrapper).
// Así no se gasta en lo que el usuario no pide.
const AUTO_GEN_KINDS = ["summary"];

function GeneratingOverlay({ noteId, fileName, kinds, onDone, onPaywall, onUsageLimit, onError }: {
  noteId: string; fileName: string; kinds: string[]; onDone: () => void; onPaywall: () => void;
  onUsageLimit: (reason: "daily" | "weekly", resetAt: string) => void;
  onError: () => void;
}) {
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const startMs = Date.now();
    const HALF_LIFE = 22000;
    let apiDone = false;
    let apiHas402 = false;
    let hasHardError = false;
    let usageLimit: { reason: "daily" | "weekly"; resetAt: string } | null = null;

    async function callApis() {
      try {
        // Una sola llamada combinada: prepara el apunte 1 vez y genera las 3 en
        // paralelo del lado del server (más rápido que 3 requests separadas).
        const res = await fetch("/api/ai/generate-suite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note_id: noteId, kinds }),
        });

        if (res.status === 402) {
          // Distinguir el paywall de venta (free) del tope de uso (pago) — no
          // son lo mismo y no le pueden salir a un usuario que ya paga.
          const body = await res.json().catch(() => ({}));
          if (body?.error === "usage_limit_reached") {
            usageLimit = { reason: body.reason, resetAt: body.resetAt };
          } else {
            apiHas402 = true;
          }
          apiDone = true;
          return;
        }

        // Antes cualquier respuesta que no fuera 402 se trataba como éxito
        // (la barra se completaba igual aunque el servidor devolviera un
        // error real) — el usuario veía "listo" y aterrizaba en una página
        // vacía sin ningún aviso de que algo falló.
        if (!res.ok) {
          hasHardError = true;
          apiDone = true;
          return;
        }
      } catch {
        hasHardError = true;
      } finally {
        apiDone = true;
      }
    }

    callApis();

    const iv = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const natural = Math.floor(94 * (1 - Math.exp(-elapsed / HALF_LIFE)));

      if (apiDone) {
        clearInterval(iv);
        if (usageLimit) { onUsageLimit(usageLimit.reason, usageLimit.resetAt); return; }
        if (apiHas402) { onPaywall(); return; }
        if (hasHardError) { onError(); return; }
        setPct(100);
        setStep(3);
        setTimeout(onDone, 1100);
        return;
      }

      setPct(natural);
      setStep(Math.min(Math.floor(natural / 25), 2));
    }, 350);

    return () => clearInterval(iv);
  }, [noteId, kinds, onDone, onPaywall, onUsageLimit, onError]);

  return (
    <div id="gen" className="show">
      <div className="gcard">
        <div className="gvid">
          <video src="/precarga.mp4" autoPlay muted loop playsInline />
        </div>
        <div className="gright">
          <h3>
            Generando tu set de estudio…{" "}
            <span className="gpct">{pct}%</span>
          </h3>
          <div className="gbar"><i style={{ width: pct + "%" }} /></div>
          {GEN_STEPS.map((s, i) => (
            <div key={i} className={`gstep${step >= i ? " on" : ""}`}>
              <span className="sk">
                {step >= i && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              {i === 0 ? fileName : s}
            </div>
          ))}
          <div className="shimrow shimmer" />
          <div className="shimrow shimmer" style={{ width: "70%" }} />
        </div>
      </div>
    </div>
  );
}

// ---- tope de uso (pagos) — distinto del paywall de venta, nunca le sale a
// alguien que no paga y nunca le toca lo que ya generó ----
function UsageLimitModal({ info, onClose }: { info: { reason: "daily" | "weekly"; resetAt: string }; onClose: () => void }) {
  const resetLabel = new Date(info.resetAt).toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const periodo = info.reason === "daily" ? "de hoy" : "de esta semana";

  return (
    <div className="fixed inset-0 bg-bg/95 flex flex-col items-center justify-center gap-5 px-6 text-center" style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,16,40,.55)", backdropFilter: "blur(4px)" }}>
      <div style={{ width: "min(400px, 100%)", background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,.25)" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⏳</div>
        <h1 className="font-display font-extrabold text-xl" style={{ marginBottom: 8, color: "var(--ink)" }}>
          Llegaste a tu límite {periodo}
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
          Ya generaste bastante {info.reason === "daily" ? "hoy" : "esta semana"}. Se renueva el {resetLabel}. Mientras tanto seguís teniendo acceso completo a todo lo que ya generaste.
        </p>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "13px", border: "none", borderRadius: 14,
            background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff",
            fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ---- error real de generación (antes se mostraba como si hubiera salido
// bien y aterrizaba en una página vacía, sin avisar nada) ----
function GenerationErrorModal({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,16,40,.55)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div style={{ width: "min(400px, 100%)", background: "#fff", borderRadius: 20, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,.25)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
        <h1 className="font-display font-extrabold text-xl" style={{ marginBottom: 8, color: "var(--ink)" }}>
          No se pudo generar
        </h1>
        <p className="text-sm" style={{ color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
          Algo falló al procesar el apunte. Podés reintentar sin costo extra por lo que ya falló.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "13px", borderRadius: 14, border: "1px solid var(--line)", background: "#fff", color: "var(--muted)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
          >
            Cerrar
          </button>
          <button
            onClick={onRetry}
            style={{ flex: 1, padding: "13px", border: "none", borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- section accordion ----
function SeccionRow({ sec, secIdx, donePcts, onCelebrate }: {
  sec: Section;
  secIdx: number;
  donePcts: Record<string, number>;
  onCelebrate: (topicId: string, secId: string, rect: DOMRect) => void;
}) {
  const [open, setOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.style.maxHeight = open ? bodyRef.current.scrollHeight + "px" : "0px";
  }, [open]);

  const avg = sec.topics.length
    ? Math.round(sec.topics.reduce((a, t) => a + (donePcts[t.id] ?? t.pct), 0) / sec.topics.length)
    : 0;

  return (
    <div className={`seccion${open ? " open" : ""}`}>
      <div className="shead" onClick={() => setOpen((o) => !o)}>
        <span className="sdot" style={{ background: `linear-gradient(135deg,${sec.color},${sec.color}cc)` }}>{secIdx + 1}</span>
        <div>
          <div className="st">{sec.name}</div>
          <div className="cnt">{sec.topics.length} temas</div>
        </div>
        <div className="right">
          <span className="pc" style={{ color: sec.color }}>{avg}%</span>
          <svg className="schev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </div>
      </div>
      <div className="etemas" ref={bodyRef} style={{ maxHeight: 0, overflow: "hidden" }}>
        {sec.topics.map((t, i) => {
          const pct = donePcts[t.id] ?? t.pct;
          const done = pct >= 100;
          return (
            <div key={t.id} className="etema">
              <MiniRing pct={pct} color={PAL[i % PAL.length]} done={done} />
              <div>
                <div className="tnm">{t.name}</div>
                <div className="esub">{t.sub}</div>
              </div>
              <span className="arw">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- main export ----
type Props = {
  note: NoteData;
  generating: boolean;
  fileName: string;
  isPro?: boolean;
  giftBonusAvailable?: boolean;
};

const STORAGE_KEY_PREFIX = "skillio_tema_";

export function EspacioClient({ note, generating, fileName, isPro = false, giftBonusAvailable = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(generating);
  // Qué generar en esta pasada: la auto (al subir) solo el resumen; al tocar un
  // modo faltante, las 3. Ver AUTO_GEN_KINDS.
  const [genKinds, setGenKinds] = useState<string[]>(AUTO_GEN_KINDS);
  const [domPct, setDomPct] = useState(0);
  const [donePcts, setDonePcts] = useState<Record<string, number>>({});
  const [showPaywall, setShowPaywall] = useState(false);
  // Regalo #3: "+1 generación por tu mail" antes del paywall (free bloqueado).
  const [showGiftBonus, setShowGiftBonus] = useState(false);
  const [giftOffered, setGiftOffered] = useState(false);
  const [bonusGranted, setBonusGranted] = useState(false);
  const [usageLimitInfo, setUsageLimitInfo] = useState<{ reason: "daily" | "weekly"; resetAt: string } | null>(null);
  const [showGenError, setShowGenError] = useState(false);
  const bigringRef = useRef<HTMLDivElement>(null);
  const plusRef = useRef<HTMLDivElement>(null);
  const [noteTitle, setNoteTitle] = useState(note.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  async function saveTitle() {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === noteTitle) { setEditingTitle(false); return; }
    setNoteTitle(trimmed);
    setEditingTitle(false);
    await fetch(`/api/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  }

  // Cargar progreso de localStorage
  useEffect(() => {
    const saved: Record<string, number> = {};
    note.sections.flatMap(s => s.topics).forEach(t => {
      const v = localStorage.getItem(STORAGE_KEY_PREFIX + t.id);
      if (v !== null) saved[t.id] = parseInt(v);
    });
    setDonePcts(saved);
  }, [note]);

  // Calcular dominio total y guardar en localStorage para home
  useEffect(() => {
    const allTopics = note.sections.flatMap(s => s.topics);
    if (!allTopics.length) { setDomPct(0); return; }
    const avg = Math.round(allTopics.reduce((a, t) => a + (donePcts[t.id] ?? t.pct), 0) / allTopics.length);
    setDomPct(avg);
    localStorage.setItem(`skillio_dominio_${note.id}`, String(avg));
  }, [donePcts, note]);

  const handleDone = useCallback(() => {
    setIsGenerating(false);
    router.replace(`/app/ia?note_id=${note.id}`);
    router.refresh();
    // Free + apunte propio (no demo): al terminar de generar mostramos el paywall
    // una sola vez — es el momento de máxima atención (quieren ver el resultado).
    // No bloquea: se cierra con "Seguir viendo gratis".
    if (!isPro && !note.id.startsWith("demo-")) setShowPaywall(true);
  }, [note.id, router, isPro]);

  // 402 free_limit_reached (free intentó un apunte nuevo estando bloqueado).
  // Antes del paywall le ofrecemos el REGALO #3: +1 generación por su mail.
  // Si ya lo ofrecimos o no tiene bonus disponible → paywall directo.
  const handlePaywall = useCallback(() => {
    setIsGenerating(false);
    if (giftBonusAvailable && !giftOffered) setShowGiftBonus(true);
    else setShowPaywall(true);
  }, [giftBonusAvailable, giftOffered]);

  const handleUsageLimit = useCallback((reason: "daily" | "weekly", resetAt: string) => {
    setIsGenerating(false);
    setUsageLimitInfo({ reason, resetAt });
  }, []);

  const handleGenError = useCallback(() => {
    setIsGenerating(false);
    setShowGenError(true);
  }, []);

  const retryGeneration = useCallback(() => {
    setShowGenError(false);
    setIsGenerating(true);
  }, []);

  function celebrate(topicId: string, _secId: string, rect: DOMRect) {
    if ((donePcts[topicId] ?? 0) >= 100) return;
    const newPcts = { ...donePcts, [topicId]: 100 };
    setDonePcts(newPcts);
    localStorage.setItem(STORAGE_KEY_PREFIX + topicId, "100");
    confettiBurst(rect.left + 30, rect.top + 18);
    if (bigringRef.current) {
      bigringRef.current.classList.remove("glow");
      void bigringRef.current.offsetWidth;
      bigringRef.current.classList.add("glow");
      setTimeout(() => bigringRef.current?.classList.remove("glow"), 1000);
    }
    const allTopics = note.sections.flatMap(s => s.topics);
    const before = domPct;
    const after = Math.round(allTopics.reduce((a, t) => a + (newPcts[t.id] ?? t.pct), 0) / allTopics.length);
    if (after > before && plusRef.current) {
      plusRef.current.textContent = `+${after - before}%`;
      plusRef.current.classList.remove("go-anim");
      void plusRef.current.offsetWidth;
      plusRef.current.classList.add("go-anim");
    }
  }

  const allTopics = note.sections.flatMap(s => s.topics);
  const doneCount = allTopics.filter(t => (donePcts[t.id] ?? t.pct) >= 100).length;
  const showEspacioTour = useTourRequired("skillio_espacio_tour_v1");

  // Cuando un modo no tiene contenido, genera SOLO ese modo (a demanda) en vez
  // de navegar. Así tocar "Tarjetas" arma solo las tarjetas, y "Simulacro" solo
  // el simulacro — sin gastar en lo que el usuario no pidió.
  function ModoWrapper({ count, href, genKind, className, style, children, tourAttr }: {
    count: number; href: string; genKind: string; className: string;
    style?: React.CSSProperties; children: React.ReactNode;
    tourAttr?: string;
  }) {
    const extra = tourAttr ? { "data-tour": tourAttr } : {};
    if (count > 0) {
      return <Link href={href} className={className} style={style} {...extra}>{children}</Link>;
    }
    return (
      <div
        className={className} style={{ ...style, cursor: "pointer" }}
        onClick={() => { setGenKinds([genKind]); setIsGenerating(true); }}
        {...extra}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      {isGenerating && (
        <GeneratingOverlay noteId={note.id} fileName={fileName} kinds={genKinds} onDone={handleDone} onPaywall={handlePaywall} onUsageLimit={handleUsageLimit} onError={handleGenError} />
      )}

      {showPaywall && <QuickPaywall ctx="generic" onClose={() => setShowPaywall(false)} />}

      {showGiftBonus && (
        <GiftPopup
          type="bonus_gen"
          eyebrow="🎁 UN REGALO PARA VOS"
          title="¿Querés una generación más?"
          subtitle={<>El plan gratis incluye 1 apunte. Dejanos tu mail y te <b>regalamos 1 generación extra</b> para que sigas estudiando. 💜</>}
          ctaText="Dame mi generación extra"
          successText="¡Generación desbloqueada! 🎉"
          onSuccess={() => { setGiftOffered(true); setBonusGranted(true); }}
          onClose={() => {
            setShowGiftBonus(false);
            setGiftOffered(true);
            if (bonusGranted) { setGenKinds(AUTO_GEN_KINDS); setIsGenerating(true); }
            else setShowPaywall(true);
          }}
        />
      )}

      {usageLimitInfo && (
        <UsageLimitModal info={usageLimitInfo} onClose={() => setUsageLimitInfo(null)} />
      )}

      {showGenError && (
        <GenerationErrorModal onRetry={retryGeneration} onClose={() => setShowGenError(false)} />
      )}

      {showEspacioTour && !isGenerating && (
        <OnboardingTour
          storageKey="skillio_espacio_tour_v1"
          steps={[
            {
              icon: <TourIconSparkles />,
              title: "¡Tu suite de estudio está lista!",
              body: "Resumen, Tarjetas y Simulacro generados de tu apunte. Cada uno refuerza lo aprendido de una forma distinta.",
              placement: "center",
              nextLabel: "¿Por dónde empiezo? ›",
            },
            {
              icon: <TourIconBook />,
              title: "Empezá por el Resumen",
              body: "Son los puntos clave del apunte explicados de forma clara. El mejor primer paso para dominar el tema.",
              target: '[data-tour="resumen-card"]',
              placement: "bottom",
              nextLabel: "Abrir Resumen ›",
            },
          ]}
        />
      )}

      <div id="confetti-layer" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 80, overflow: "hidden" }} />

      <div className="espacio">
        <main>
          {/* breadcrumb */}
          <nav className="crumb">
            <Link href="/app">Mis apuntes</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 6 6 6-6 6" /></svg>
            <b>{note.subjectName}</b>
          </nav>

          {/* hero */}
          <section className="ehero in" style={{ animationDelay: ".0s" }}>
            <span className="eblob b1" /><span className="eblob b2" />
            <div className="ehero-row">
              <div>
                <span className="echip">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h7l-1 8 10-12h-7z" /></svg>
                  {domPct >= 50 ? `¡Vamos por el ${Math.ceil(domPct / 10) * 10}%!` : "¡Empezá a dominar!"}
                </span>
                {editingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(noteTitle); } }}
                    autoFocus
                    style={{
                      fontFamily: "var(--po)", fontWeight: 800, fontSize: "inherit",
                      color: "#fff", background: "rgba(255,255,255,.15)",
                      border: "none", borderBottom: "2px solid rgba(255,255,255,.6)",
                      borderRadius: 6, padding: "2px 6px", width: "100%",
                      outline: "none", lineHeight: 1.2,
                    }}
                  />
                ) : (
                  <h1 className="po" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {noteTitle}
                    <button
                      onClick={() => { setTitleDraft(noteTitle); setEditingTitle(true); }}
                      aria-label="Renombrar"
                      style={{ background: "rgba(255,255,255,.18)", border: "none", borderRadius: 8, padding: "4px 6px", cursor: "pointer", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
                      </svg>
                    </button>
                  </h1>
                )}
                <p className="sub">{allTopics.length} temas listos para estudiar. Sumá Dominio jugando con resumen, tarjetas y simulacro.</p>
                <div className="acts">
                  {note.fileUrl ? (
                    <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="hbtn" style={{ textDecoration: "none" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                      </svg>
                      Ver archivo
                    </a>
                  ) : (
                    <button className="hbtn" disabled style={{ opacity: 0.45 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
                      </svg>
                      Ver archivo
                    </button>
                  )}
                  <button
                    className="hbtn"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href).catch(() => {});
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                      <path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5" />
                    </svg>
                    Compartir
                  </button>
                </div>
              </div>
              <Image className="booki-illu" src="/booki-3.png" alt="Booki" width={256} height={256} />
            </div>
          </section>

          {/* modos */}
          <div className="sectit">
            <svg className="star" viewBox="0 0 24 24" fill="#8b5cf6"><path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" /></svg>
            <h2 className="po">Estudiá jugando</h2>
            <span className="more">Generado de tu apunte</span>
          </div>

          <div className="modos">
            <ModoWrapper count={note.summaryCount} genKind="summary" href={`/app/ia/resumen?note_id=${note.id}`} className="modo blue in" style={{ animationDelay: ".1s" }} tourAttr="resumen-card">
              <span className="deco" /><span className="deco2" /><span className="sweep" />
              <div className="top">
                <span className="mi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 5a1 1 0 0 1 1-1h5a3 3 0 0 1 2 1 3 3 0 0 1 2-1h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5a1 1 0 0 1-1-1Z" />
                  </svg>
                </span>
                <span className="badge"><b>{note.summaryCount}</b><span>puntos</span></span>
              </div>
              <div className="mt po">Resumen</div>
              <div className="md">El apunte explicado por puntos clave que refuerzan.</div>
              <div className="pwrap">
                <div className="pbar"><i style={{ width: note.summaryCount ? `${domPct}%` : "0%" }} /></div>
                <div className="pfoot">
                  <span className="stat">
                    {!note.summaryCount
                      ? "Tocá para generar ⚡"
                      : domPct >= 100
                        ? "¡Completado! 🎉"
                        : domPct > 0
                          ? `En progreso · ${domPct}%`
                          : "Empezá a leer →"}
                  </span>
                  <span className="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                </div>
              </div>
            </ModoWrapper>

            <ModoWrapper count={note.flashcardsCount} genKind="flashcards" href={`/app/ia/tarjetas?note_id=${note.id}`} className="modo violet in" style={{ animationDelay: ".17s" }}>
              <span className="deco" /><span className="deco2" /><span className="sweep" />
              <div className="top">
                <span className="mi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="6" width="14" height="12" rx="2" /><path d="M8 3h13v12" />
                  </svg>
                </span>
                <span className="badge"><b>{note.flashcardsCount}</b><span>tarjetas</span></span>
              </div>
              <div className="mt po">Tarjetas</div>
              <div className="md">Memorizá los términos con repetición espaciada.</div>
              <div className="pwrap">
                <div className="pbar"><i style={{ width: note.flashcardsCount ? "24%" : "0%" }} /></div>
                <div className="pfoot">
                  <span className="stat">{note.flashcardsCount ? `${note.flashcardsCount} tarjetas` : "Tocá para generar ⚡"}</span>
                  <span className="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                </div>
              </div>
            </ModoWrapper>

            <ModoWrapper count={note.simulacroCount} genKind="simulacro" href={`/app/ia/simulacro?note_id=${note.id}`} className="modo coral in" style={{ animationDelay: ".24s" }}>
              <span className="deco" /><span className="deco2" /><span className="sweep" />
              <div className="top">
                <span className="mi">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" />
                  </svg>
                </span>
                <span className="badge"><b>{note.simulacroCount}</b><span>preguntas</span></span>
              </div>
              <div className="mt po">Simulacro</div>
              <div className="md">Examen tipo parcial. Detectá tus lagunas.</div>
              <div className="pwrap">
                <div className="pbar"><i style={{ width: "0%" }} /></div>
                <div className="pfoot">
                  <span className="stat">{note.simulacroCount ? "¡Nuevo! Sin empezar" : "Tocá para generar ⚡"}</span>
                  <span className="go"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
                </div>
              </div>
            </ModoWrapper>
          </div>

          {/* Banner: Modo Juego (Kahoot single-player) — reusa el simulacro */}
          <ModoWrapper
            count={note.simulacroCount}
            genKind="simulacro"
            href={`/app/ia/jugar?note_id=${note.id}`}
            className="in game-banner"
            style={{
              display: "flex", alignItems: "center", gap: 16, marginTop: 14, padding: "16px 20px",
              borderRadius: 20, textDecoration: "none", position: "relative", overflow: "hidden",
              background: "radial-gradient(120% 160% at 12% 0%, #2a1f5e 0%, #1a1440 55%, #120e2e 100%)",
              border: "1px solid rgba(150,110,255,.35)",
              boxShadow: "0 12px 40px rgba(80,40,180,.35), 0 0 0 1px rgba(255,255,255,.04) inset",
              animationDelay: ".28s",
            }}
          >
            <span style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,#7c3aed,transparent 70%)", opacity: .5, filter: "blur(20px)", pointerEvents: "none" }} />
            <Image src="/booki-3.png" alt="Booki" width={62} height={62} style={{ width: 62, height: 62, objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 4px 12px rgba(124,58,237,.6))" }} />
            <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: "#c4b5fd", background: "rgba(150,110,255,.16)", border: "1px solid rgba(150,110,255,.3)", borderRadius: 999, padding: "2px 9px", marginBottom: 6 }}>
                NUEVO · MODO JUEGO
              </div>
              <div className="po" style={{ color: "#fff", fontWeight: 800, fontSize: 17, lineHeight: 1.2 }}>🎮 Divertite estudiando</div>
              <div style={{ color: "rgba(255,255,255,.68)", fontSize: 13, marginTop: 2 }}>
                {note.simulacroCount ? "Contrarreloj, 10 vidas y racha. ¿Superás tu récord?" : "Generá el simulacro y desbloqueá el juego ⚡"}
              </div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 46, height: 46, flexShrink: 0, borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", boxShadow: "0 6px 20px rgba(99,60,220,.6)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
            </span>
          </ModoWrapper>

          {/* mapa del tema */}
          <div className="sectit">
            <svg className="star" viewBox="0 0 24 24" fill="none" stroke="#4f7dff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
            </svg>
            <h2 className="po">Mapa del tema</h2>
            <span className="more">{note.sections.length} secciones · {allTopics.length} temas</span>
          </div>

          <div className="epanel in" style={{ animationDelay: ".3s" }}>
            {note.sections.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)" }}>
                <p>Generá el resumen primero para ver el mapa del tema.</p>
              </div>
            ) : (
              note.sections.map((sec, i) => (
                <SeccionRow
                  key={sec.id}
                  sec={sec}
                  secIdx={i}
                  donePcts={donePcts}
                  onCelebrate={celebrate}
                />
              ))
            )}
          </div>
        </main>

        {/* right rail */}
        <aside className="erail">
          <div className="player">
            <div className="ph">
              <div className="pav">
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
                  <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" />
                </svg>
              </div>
              <div>
                <div className="lv po">Tu dominio</div>
                <div className="lab">{note.title}</div>
              </div>
            </div>
            <div className="pbody" style={{ position: "relative" }}>
              <div ref={bigringRef} style={{ position: "relative" }}>
                <DominioRing pct={domPct} />
                <div ref={plusRef} className="plusx" />
              </div>
            </div>
            <div className="stats3">
              <div className="stat3">
                <div className="si" style={{ background: "linear-gradient(135deg,#ff8a5c,#ff6b81)" }}>
                  <svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2c1 4-2 5-2 8a4 4 0 0 0 8 0c0-1-1-2-1-3 2 1 3 3 3 6a8 8 0 1 1-16 0c0-5 5-7 6-11Z" /></svg>
                </div>
                <b>0</b>
                <span>días de racha</span>
              </div>
              <div className="stat3">
                <div className="si" style={{ background: "linear-gradient(135deg,#34d399,#10b981)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
                </div>
                <b>{doneCount}/{allTopics.length}</b>
                <span>dominados</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

// exportar SEC_COLORS para que page.tsx los use
export { SEC_COLORS };
