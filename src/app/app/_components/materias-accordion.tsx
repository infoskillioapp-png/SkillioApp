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

function MateriaRow({ materia, idx, defaultOpen }: { materia: Materia; idx: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
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
