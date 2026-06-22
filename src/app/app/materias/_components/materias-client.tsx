"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApunteRing } from "./apunte-ring";

const GRADIENTS: [string, string][] = [
  ["#5b8cff", "#3f63ff"],
  ["#9a63f7", "#7c3aed"],
  ["#ff5d79", "#e4264f"],
  ["#34d399", "#10b981"],
  ["#f472b6", "#ec4899"],
  ["#2dd4bf", "#0d9488"],
];

const PALETTE_CSS = [
  "#4f7dff","#8b5cf6","#ff6b81","#f59e0b","#10b981","#f472b6","#2dd4bf","#ef4444",
];

type Apunte = { id: string; title: string; has_ai_content: boolean };
type Materia = { id: string; name: string; color: string; apuntes: Apunte[] };

// ---- modal nueva materia ----
function NuevaMateriaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE_CSS[0]);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/subjects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    setLoading(false);
    if (res.ok) { onCreated(); onClose(); }
  }

  return (
    <div className="nm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nm-card">
        <h2 className="po">Nueva materia</h2>
        <input className="nm-input" placeholder="Nombre (ej. Anatomía)" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} autoFocus />
        <div className="nm-colors">
          {PALETTE_CSS.map((c) => (
            <div key={c} className={`nm-color${color === c ? " sel" : ""}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="nm-foot">
          <button className="nm-cancel" onClick={onClose}>Cancelar</button>
          <button className="nm-ok" onClick={handleCreate} disabled={loading || !name.trim()}>
            {loading ? "Creando…" : "Crear materia"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- row de materia ----
function MateriaCard({ materia, idx, onDeleted }: { materia: Materia; idx: number; onDeleted: () => void }) {
  const [open, setOpen] = useState(idx === 0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const grad = GRADIENTS[idx % GRADIENTS.length];
  const col = materia.color || grad[1];
  const avg = materia.apuntes.length
    ? Math.round(materia.apuntes.reduce((a, n) => a + (n.has_ai_content ? 50 : 0), 0) / materia.apuntes.length)
    : 0;

  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.style.maxHeight = open ? bodyRef.current.scrollHeight + "px" : "0px";
  }, [open, materia.apuntes.length]);

  return (
    <div className={`mat-card${open ? " open" : ""}`}>
      <div className="mat-hd" onClick={() => setOpen((o) => !o)}>
        <div className="mat-ico" style={{ background: `linear-gradient(135deg,${col}cc,${col})` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <div className="mat-info">
          <div className="mat-nm">{materia.name}</div>
          <div className="mat-sub">{materia.apuntes.length} apunte{materia.apuntes.length !== 1 ? "s" : ""} · {avg}% dominio promedio</div>
        </div>
        <div className="mat-right">
          <span className="mat-pct" style={{ color: col }}>{avg}%</span>
          <svg className="mat-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </div>
      </div>
      <div className="mat-body" ref={bodyRef} style={{ maxHeight: 0, overflow: "hidden" }}>
        {materia.apuntes.length === 0 ? (
          <div className="mat-empty">Todavía no hay apuntes en esta materia.</div>
        ) : (
          materia.apuntes.map((a) => (
            <Link key={a.id} href={`/app/ia?note_id=${a.id}`} className="mat-apunte">
              <ApunteRing pct={a.has_ai_content ? 50 : 0} color={col} />
              <div>
                <div className="anm">{a.title}</div>
                <div className="asub">{a.has_ai_content ? "50% dominio" : "Sin generar aún"}</div>
              </div>
              <span className="aarw">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// ---- main ----
type Props = {
  materias: Materia[];
  totalNotes: number;
};

export function MateriasClient({ materias: initialMaterias, totalNotes }: Props) {
  const [materias, setMaterias] = useState(initialMaterias);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function refresh() {
    router.refresh();
    setShowModal(false);
  }

  const totalMaterias = materias.length;

  return (
    <>
      <div className="page-wrap">
        {/* hero */}
        <div className="page-hero" style={{ background: "linear-gradient(125deg,#4f7dff 0%,#8b5cf6 55%,#c1338f 100%)" }}>
          <h1>Mis materias</h1>
          <p>Todos tus apuntes ordenados por materia. Hacé clic en una para ver sus notas y continuar estudiando.</p>
          <div className="hacts">
            <button className="wbtn main" onClick={() => setShowModal(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Nueva materia
            </button>
            <span className="wbtn" style={{ pointerEvents: "none" }}>
              {totalMaterias} materias · {totalNotes} apuntes
            </span>
          </div>
        </div>

        {/* lista */}
        {materias.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📁</div>
            <h3 className="po" style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Todavía no tenés materias</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>Creá tu primera materia para organizar tus apuntes.</p>
            <button className="wbtn main" style={{ background: "linear-gradient(135deg,var(--blue),var(--violet))", color: "#fff", padding: "12px 22px", borderRadius: 14, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }} onClick={() => setShowModal(true)}>
              Crear primera materia
            </button>
          </div>
        ) : (
          <div className="mat-grid">
            {materias.map((m, i) => (
              <MateriaCard key={m.id} materia={m} idx={i} onDeleted={refresh} />
            ))}
          </div>
        )}
      </div>

      {showModal && <NuevaMateriaModal onClose={() => setShowModal(false)} onCreated={refresh} />}
    </>
  );
}
