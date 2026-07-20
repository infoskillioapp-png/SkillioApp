"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const RC = 2 * Math.PI * 16;

function ApunteRing({ pct, color }: { pct: number; color: string }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const done = pct >= 100;
  const offset = RC - (pct / 100) * RC;

  useEffect(() => {
    if (!circleRef.current) return;
    circleRef.current.style.strokeDashoffset = String(RC);
    const t = setTimeout(() => {
      if (!circleRef.current) return;
      circleRef.current.style.transition = "stroke-dashoffset .6s ease";
      circleRef.current.style.strokeDashoffset = String(offset);
    }, 80);
    return () => clearTimeout(t);
  }, [offset]);

  return (
    <div className="ring-s" style={{ position: "relative" }}>
      <svg viewBox="0 0 42 42" style={{ transform: "rotate(-90deg)", width: "100%", height: "100%" }}>
        <circle cx="21" cy="21" r="16" fill="none" stroke="#eef0f8" strokeWidth="4" />
        <circle
          ref={circleRef}
          cx="21" cy="21" r="16"
          fill="none"
          stroke={done ? "#10b981" : (pct ? color : "#c2c4d8")}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RC}
          strokeDashoffset={RC}
        />
      </svg>
      {done ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", inset: 0, margin: "auto" }}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="pcm" style={{ color: pct ? color : "#c2c4d8" }}>{pct}%</span>
      )}
    </div>
  );
}

const GRADIENTS: [string, string][] = [
  ["#5b8cff", "#3f63ff"],
  ["#9a63f7", "#7c3aed"],
  ["#ff5d79", "#e4264f"],
  ["#34d399", "#10b981"],
  ["#f472b6", "#ec4899"],
  ["#2dd4bf", "#0d9488"],
];

type Apunte = { id: string; title: string; has_ai_content: boolean };
type Materia = { id: string; name: string; color: string; apuntes: Apunte[] };

function ApunteItem({ apunte, color, pct }: { apunte: Apunte; color: string; pct: number }) {
  const [title, setTitle] = useState(apunte.title);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(apunte.title);
  const inputRef = useRef<HTMLInputElement>(null);

  async function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === title) { setEditing(false); return; }
    setTitle(trimmed);
    setEditing(false);
    await fetch(`/api/notes/${apunte.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  }

  if (editing) {
    return (
      <div className="mat-apunte" style={{ cursor: "default" }}>
        <ApunteRing pct={pct} color={color} />
        <div style={{ flex: 1 }}>
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setDraft(title); } }}
            autoFocus
            style={{
              fontWeight: 600, fontSize: 14, color: "var(--ink)",
              background: "#f3f0ff", border: "none",
              borderBottom: "2px solid var(--violet)",
              borderRadius: 4, padding: "2px 6px", width: "100%",
              outline: "none",
            }}
          />
          <div className="asub">{apunte.has_ai_content ? `${pct}% dominio` : "Sin generar aún"}</div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/app/ia?note_id=${apunte.id}`} className="mat-apunte">
      <ApunteRing pct={pct} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="anm">{title}</div>
        <div className="asub">{apunte.has_ai_content ? `${pct}% dominio` : "Sin generar aún"}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); setDraft(title); setEditing(true); }}
          aria-label="Renombrar"
          style={{ background: "none", border: "none", padding: "4px 6px", cursor: "pointer", borderRadius: 8, color: "var(--muted)", display: "flex", alignItems: "center" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
          </svg>
        </button>
        <span className="aarw">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

function MateriaRow({ materia, idx, defaultOpen }: { materia: Materia; idx: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const grad = GRADIENTS[idx % GRADIENTS.length];
  const col = materia.color || grad[1];

  // % real de avance (temas marcados como hechos en "Espacio", ver
  // skillio_dominio_<noteId> en espacio-client.tsx) en vez de un 50% fijo.
  const [localDominio, setLocalDominio] = useState<Record<string, number>>({});
  useEffect(() => {
    const stored: Record<string, number> = {};
    for (const a of materia.apuntes) {
      const v = localStorage.getItem(`skillio_dominio_${a.id}`);
      if (v !== null) stored[a.id] = parseInt(v, 10);
    }
    setLocalDominio(stored);
  }, [materia.apuntes]);
  const pctFor = (a: Apunte) => localDominio[a.id] ?? (a.has_ai_content ? 50 : 0);

  const avg = materia.apuntes.length
    ? Math.round(materia.apuntes.reduce((a, n) => a + pctFor(n), 0) / materia.apuntes.length)
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
            <ApunteItem key={a.id} apunte={a} color={col} pct={pctFor(a)} />
          ))
        )}
      </div>
    </div>
  );
}

type Props = {
  subjects: { id: string; name: string; color: string }[];
  notes: { id: string; subject_id: string | null; title: string; has_ai_content: boolean }[];
  onUpload: () => void;
};

export function MateriasAccordion({ subjects, notes, onUpload }: Props) {
  const materias: Materia[] = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    apuntes: notes.filter((n) => n.subject_id === s.id),
  }));

  if (materias.length === 0) {
    return (
      <div className="mat-grid">
        <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--muted)" }}>
          <img src="/bookisubirarchivocorrecto.png" alt="Booki" style={{ width: 130, filter: "drop-shadow(0 10px 18px rgba(99,60,220,.22))", marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>Todavía no tenés apuntes</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Subí el primero y Booki te arma el resumen, las tarjetas y el simulacro.</p>
          <button className="wbtn main" onClick={onUpload} style={{ background: "linear-gradient(135deg,var(--blue),var(--violet))", color: "#fff", padding: "11px 22px", borderRadius: 14, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Subir mi primer apunte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mat-grid">
      {materias.map((m, i) => (
        <MateriaRow key={m.id} materia={m} idx={i} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
