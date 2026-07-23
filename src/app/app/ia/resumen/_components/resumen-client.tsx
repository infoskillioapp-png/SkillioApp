"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { SalePopup } from "@/components/sale-popup";
import { RescuePrompt } from "@/components/rescue-prompt";
import { OnboardingTour, useTourRequired, TourIconBook } from "../../../_components/onboarding-tour";

// El resumen es Markdown. Cada sección (un '## ' del documento) es una unidad
// navegable: se muestra de a una, con su propio progreso ("dominado"). El
// candado free y los modos (tarjetas/simulacro) se conservan del diseño previo.

export type ResumenSection = { heading: string; markdown: string };

export type ResumenData = {
  noteId: string;
  noteTitle: string;
  subjectName: string;
  title: string; // H1 del resumen (puede venir vacío)
  intro: string; // texto antes del primer '## ' (opcional)
  sections: ResumenSection[]; // ya recortadas para free en el server
  lockedCount: number; // slots bloqueados a mostrar (free); 0 si pro
  fileUrl: string | null;
};

const ESPACIO_KEY = "skillio_tema_";

// Render de Markdown con tablas (remark-gfm ya usado en el proyecto).
function MD({ text }: { text: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
    </div>
  );
}

// ---- sidebar de temas ----
function ResumenSidebar({
  sections,
  activeIdx,
  doneSet,
  isPro,
  lockedCount,
  fileUrl,
  onSelect,
  onLocked,
}: {
  sections: ResumenSection[];
  activeIdx: number;
  doneSet: Set<number>;
  isPro: boolean;
  lockedCount: number;
  fileUrl: string | null;
  onSelect: (i: number) => void;
  onLocked: () => void;
}) {
  return (
    <aside className="rside in">
      <style>{`
        @keyframes lockShimmer { 0% { background-position: -250% center; } 100% { background-position: 250% center; } }
        @keyframes lockPulse {
          0%, 100% { box-shadow: 0 0 0px rgba(150,85,229,0), inset 0 0 0px rgba(150,85,229,0); }
          50% { box-shadow: 0 0 14px rgba(150,85,229,.35), inset 0 0 8px rgba(150,85,229,.08); }
        }
        @keyframes lockIconBounce { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-3px) scale(1.15); } }
        .t-item-locked {
          cursor: pointer; border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,.55) 0%, rgba(240,235,255,.45) 100%);
          backdrop-filter: blur(6px); border: 1px solid rgba(150,85,229,.18) !important;
          animation: lockPulse 2.6s ease-in-out infinite; transition: transform .15s;
        }
        .t-item-locked:hover { transform: translateY(-1px); border-color: rgba(150,85,229,.4) !important; }
        .t-item-locked .t-name {
          background: linear-gradient(90deg, #1f2347 15%, #9655E5 35%, #c084fc 50%, #9655E5 65%, #1f2347 85%);
          background-size: 250% auto; -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent; animation: lockShimmer 2.8s linear infinite; font-weight: 700 !important;
        }
        .t-item-locked .lock-icon { animation: lockIconBounce 2.2s ease-in-out infinite; display: inline-block; font-size: 13px; }
        .md-body h3 {
          font-family: var(--po); font-weight: 800; font-size: 16.5px; color: #6d28d9;
          margin: 22px 0 10px; padding-left: 11px; border-left: 4px solid #8b5cf6;
        }
        .md-body p { margin: 0 0 12px; line-height: 1.75; }
        .md-body ul, .md-body ol { margin: 0 0 14px; padding-left: 22px; line-height: 1.75; }
        .md-body li { margin-bottom: 7px; }
        .md-body li::marker { color: #8b5cf6; }
        .md-body strong { font-weight: 700; color: #14162b; }
        .md-body em { color: #5b6178; }
        .md-body table {
          border-collapse: separate; border-spacing: 0; width: 100%; margin: 16px 0;
          font-size: 13.5px; border: 1px solid #e6e0f5; border-radius: 12px; overflow: hidden;
          box-shadow: 0 4px 14px rgba(124,58,237,.08);
        }
        .md-body th {
          background: linear-gradient(135deg,#8b5cf6,#7c3aed); color: #fff;
          font-weight: 700; padding: 10px 12px; text-align: left; font-size: 12.5px;
        }
        .md-body td { padding: 9px 12px; text-align: left; vertical-align: top; border-top: 1px solid #eee6fb; }
        .md-body tbody tr:nth-child(even) { background: rgba(139,92,246,.045); }
        .md-body .katex-display { margin: 14px 0; overflow-x: auto; }

        /* ---- Modo oscuro (solo lectura del resumen) ---- */
        .resumen-dark { background: #14151f; min-height: 100vh; }
        .resumen-dark .rtopbar { background: #1b1d2b !important; border-color: #2a2d40 !important; }
        .resumen-dark .rtopbar .back, .resumen-dark .crumb-r, .resumen-dark .crumb-r b, .resumen-dark .rfiles { color: #c7cad8 !important; }
        .resumen-dark .rside { background: #1b1d2b !important; border-color: #2a2d40 !important; }
        .resumen-dark .rside h2 { color: #eef0f8 !important; }
        .resumen-dark .slabel { color: #9aa0b8 !important; }
        .resumen-dark .t-item { background: #23263a !important; border-color: #2f3350 !important; }
        .resumen-dark .t-item .t-name { color: #eef0f8 !important; }
        .resumen-dark .t-item .t-sub { color: #9aa0b8 !important; }
        .resumen-dark .t-item.on { background: #2b2f4a !important; }
        .resumen-dark .reader-main { color: #dfe2f0; }
        .resumen-dark .sec-eyebrow { color: #b7a6f5 !important; }
        .resumen-dark .rtitle { color: #f4f5fc !important; }
        .resumen-dark .rcard { background: #1e2030 !important; border-color: #2a2d40 !important; box-shadow: none !important; }
        .resumen-dark .md-body { color: #d5d8e8; }
        .resumen-dark .md-body h3 { color: #c4b5fd; border-left-color: #7c3aed; }
        .resumen-dark .md-body strong { color: #f4f5fc; }
        .resumen-dark .md-body em { color: #a7adc6; }
        .resumen-dark .md-body td { border-top-color: #2f3350; }
        .resumen-dark .md-body table { border-color: #2f3350; box-shadow: none; }
        .resumen-dark .md-body tbody tr:nth-child(even) { background: rgba(139,92,246,.10); }
        .rdark-toggle { display: inline-flex; align-items: center; gap: 6px; background: transparent; border: 1px solid rgba(120,90,200,.3); color: inherit; border-radius: 10px; padding: 5px 10px; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .resumen-dark .rdark-toggle { border-color: #3a3f5c; color: #c7cad8; }
      `}</style>

      <h2 className="po">
        Temas
        {!isPro && lockedCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginLeft: 8 }}>
            {sections.length}/{sections.length + lockedCount} 🔒
          </span>
        )}
      </h2>

      {fileUrl ? (
        <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn-full" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          Apunte original
        </a>
      ) : (
        <button className="btn-full" style={{ opacity: 0.5, cursor: "default" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          Resumen completo
        </button>
      )}

      {sections.map((sec, i) => {
        const isDone = doneSet.has(i);
        const isActive = i === activeIdx;
        return (
          <div key={i} className={`t-item${isDone ? " done" : ""}${isActive ? " on" : ""}`} onClick={() => onSelect(i)}>
            <span className="t-dot">{isDone ? "✓" : ""}</span>
            <div>
              <div className="t-name">{sec.heading}</div>
              <div className="t-sub">{isDone ? "Dominado · 100%" : isActive ? "En progreso" : "Sin empezar"}</div>
            </div>
          </div>
        );
      })}

      {!isPro && lockedCount > 0 && (
        <div>
          <div className="slabel">Más contenido</div>
          {Array.from({ length: lockedCount }).map((_, i) => (
            <div key={`lk-${i}`} className="t-item t-item-locked" onClick={onLocked}>
              <span className="t-dot"><span className="lock-icon">🔒</span></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div aria-hidden style={{ height: 9, width: `${72 - i * 6}%`, minWidth: 88, borderRadius: 6, marginBottom: 7, background: "linear-gradient(90deg, rgba(150,85,229,.22) 15%, rgba(192,132,252,.5) 50%, rgba(150,85,229,.22) 85%)", backgroundSize: "250% auto", animation: "lockShimmer 2.8s linear infinite" }} />
                <div className="t-sub" style={{ color: "#9655E5", fontWeight: 600, fontSize: 11 }}>✨ Desbloqueá con PRO</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

// ---- componente principal ----
export function ResumenClient({
  data,
  isPro,
  isDemo = false,
  isGuest = false,
}: {
  data: ResumenData;
  isPro: boolean;
  isDemo?: boolean;
  isGuest?: boolean;
}) {
  const DONE_KEY = `skillio_resumen_done_${data.noteId}`;

  const [activeIdx, setActiveIdx] = useState(0);
  const [doneSet, setDoneSet] = useState<Set<number>>(() => {
    if (typeof window === "undefined") return new Set<number>();
    try {
      const saved = localStorage.getItem(DONE_KEY);
      return saved ? new Set<number>(JSON.parse(saved) as number[]) : new Set<number>();
    } catch { return new Set<number>(); }
  });
  const [showPaywall, setShowPaywall] = useState(false);
  const [rescueOpen, setRescueOpen] = useState(false);
  const [rescueDone, setRescueDone] = useState(false);
  const showResumenTour = useTourRequired("skillio_resumen_tour_v1");
  // Modo oscuro solo para la lectura del resumen (descansa la vista en sesiones
  // largas). Se recuerda en localStorage.
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("skillio_resumen_dark") === "1"; } catch { return false; }
  });
  function toggleDark() {
    setDark((d) => {
      const next = !d;
      try { localStorage.setItem("skillio_resumen_dark", next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  }

  const sections = data.sections;
  const safeActiveIdx = Math.min(activeIdx, Math.max(0, sections.length - 1));
  const active = sections[safeActiveIdx];
  const doneCount = doneSet.size;

  function closePaywall() {
    setShowPaywall(false);
    if (isGuest && !rescueDone) setRescueOpen(true);
  }

  function persistDone(newSet: Set<number>) {
    try { localStorage.setItem(DONE_KEY, JSON.stringify([...newSet])); } catch { /* noop */ }
  }

  function markTopicDoneInEspacio(idx: number) {
    try { localStorage.setItem(`${ESPACIO_KEY}topic-${data.noteId}-${idx}`, "100"); } catch { /* noop */ }
  }

  function markDone() {
    setDoneSet((prev) => {
      const next = new Set([...prev, safeActiveIdx]);
      persistDone(next);
      return next;
    });
    markTopicDoneInEspacio(safeActiveIdx);
    if (safeActiveIdx < sections.length - 1) setActiveIdx((i) => i + 1);
  }

  function handleSelect(i: number) {
    setActiveIdx(i);
  }

  if (!active) return <div style={{ padding: 40, color: "var(--muted)" }}>Sin contenido generado aún.</div>;

  return (
    <div className={dark ? "resumen-dark" : undefined}>
      {showPaywall && <SalePopup ctx="resumen" onClose={closePaywall} />}
      {rescueOpen && !rescueDone && (
        <RescuePrompt
          noteId={data.noteId}
          onClose={() => setRescueOpen(false)}
          onDone={() => { setRescueDone(true); setRescueOpen(false); }}
        />
      )}

      {showResumenTour && (
        <OnboardingTour
          storageKey="skillio_resumen_tour_v1"
          steps={[
            { icon: <TourIconBook />, title: "Navegá entre temas", body: "Tocá cualquier tema de la lista para saltar entre ellos. Los que domines quedan marcados en verde.", target: ".rside", placement: "right", nextLabel: "Entendido ›" },
            { icon: <TourIconBook />, title: "Seguí estudiando", body: "Cuando termines el resumen, reforzá con las Tarjetas o poné a prueba lo aprendido con el Simulacro.", target: '[data-tour="mode-nav"]', placement: "top", nextLabel: "¡Listo, a estudiar!" },
          ]}
        />
      )}

      {isDemo && (
        <div style={{ background: "linear-gradient(90deg,#7c3aed,#4f7dff)", color: "#fff", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
          <span>✨ Estás viendo una demo — subí tu propio apunte para generar tu set de estudio.</span>
          <Link href={isGuest ? "/app?upload=1" : "/app/materias"} style={{ background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.35)", color: "#fff", padding: "6px 14px", borderRadius: 10, fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
            Subir mi apunte →
          </Link>
        </div>
      )}

      <div className="rtopbar">
        <Link href={`/app/ia?note_id=${data.noteId}`} className="back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
          Volver
        </Link>
        <div className="crumb-r">{data.subjectName} · <b>Resumen</b></div>
        <div className="rfiles">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
          {doneCount}/{sections.length}{!isPro && data.lockedCount > 0 ? ` · 🔒 ${data.lockedCount}` : ""} dominados
        </div>
        <button className="rdark-toggle" onClick={toggleDark} title="Modo lectura oscuro" aria-label="Alternar modo oscuro">
          {dark ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              Claro
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
              Oscuro
            </>
          )}
        </button>
      </div>

      <div className="rwrap">
        <ResumenSidebar
          sections={sections}
          activeIdx={safeActiveIdx}
          doneSet={doneSet}
          isPro={isPro}
          lockedCount={data.lockedCount}
          fileUrl={data.fileUrl}
          onSelect={handleSelect}
          onLocked={() => setShowPaywall(true)}
        />

        <main className="reader-main">
          <div className="rhead in">
            <div className="sec-eyebrow">{data.title || data.noteTitle} · Tema {safeActiveIdx + 1} de {sections.length}</div>
            <h1 className="rtitle">{active.heading}</h1>
          </div>

          {/* Modos (Tarjetas / Simulacro) */}
          <div data-tour="mode-nav" style={{ display: "flex", gap: 10, margin: "0 0 16px", flexWrap: "wrap" }}>
            <Link href={`/app/ia/tarjetas?note_id=${data.noteId}`} style={{ flex: 1, minWidth: 130, padding: "12px 16px", borderRadius: 14, background: "linear-gradient(135deg,#8b5cf6,#7c3aed)", color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", textDecoration: "none", boxShadow: "0 6px 18px rgba(124,58,237,.28)" }}>
              🃏 Ir a Tarjetas
            </Link>
            <Link href={`/app/ia/simulacro?note_id=${data.noteId}`} style={{ flex: 1, minWidth: 130, padding: "12px 16px", borderRadius: 14, background: "linear-gradient(135deg,#ff5d79,#e4264f)", color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", textDecoration: "none", boxShadow: "0 6px 18px rgba(255,93,121,.28)" }}>
              📝 Hacer Simulacro
            </Link>
          </div>

          {!isDemo && (
            <a
              href={`/api/ai/resumen-pdf?note_id=${data.noteId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                width: "100%", margin: "0 0 16px", padding: "13px 16px", borderRadius: 14,
                background: "linear-gradient(135deg,#10b981,#059669)",
                color: "#fff", fontFamily: "var(--po)", fontWeight: 700, fontSize: 13.5,
                textDecoration: "none", boxShadow: "0 6px 18px rgba(16,185,129,.30)",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Descargar PDF
            </a>
          )}

          <div className="rcard in">
            <MD text={active.markdown} />

            {!isPro && data.lockedCount > 0 && safeActiveIdx === sections.length - 1 && (
              <div style={{ marginTop: 24, background: "linear-gradient(135deg,rgba(139,92,246,.07),rgba(79,125,255,.07))", border: "1.5px solid rgba(139,92,246,.2)", borderRadius: 18, padding: "18px" }}>
                <div style={{ fontFamily: "var(--po)", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                  🔒 El resumen completo te espera
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                  Esta es la parte gratuita. Desbloqueá el resumen completo para dominar el apunte entero.
                </div>
                <button onClick={() => setShowPaywall(true)} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#8b5cf6,#4f7dff)", color: "#fff", border: "none", borderRadius: 13, fontFamily: "var(--po)", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 8px 20px rgba(99,38,210,.22)" }}>
                  ⚡ Desbloquear resumen completo
                </button>
              </div>
            )}
          </div>

          {/* nav entre temas */}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            {safeActiveIdx > 0 && (
              <button className="nbtn ghost" onClick={() => setActiveIdx((i) => i - 1)}>← Anterior</button>
            )}
            {!doneSet.has(safeActiveIdx) && (
              <button className="nbtn" onClick={markDone}>Marcar como dominado ✓</button>
            )}
            {safeActiveIdx < sections.length - 1 ? (
              <button className="nbtn" onClick={() => setActiveIdx((i) => i + 1)} style={{ marginLeft: "auto" }}>Siguiente tema →</button>
            ) : !isPro && data.lockedCount > 0 ? (
              <button className="nbtn" onClick={() => setShowPaywall(true)} style={{ marginLeft: "auto", background: "linear-gradient(135deg,#8b5cf6,#4f7dff)" }}>🔒 Siguiente tema →</button>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
