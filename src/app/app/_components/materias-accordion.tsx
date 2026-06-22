"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Apunte = {
  id: string;
  title: string;
  dominio: number;
};

type Materia = {
  id: string;
  name: string;
  color: [string, string];
  icon: React.ReactNode;
  apuntes: Apunte[];
};

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

function MateriaRow({ materia, defaultOpen }: { materia: Materia; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyRef = useRef<HTMLDivElement>(null);
  const avg = materia.apuntes.length
    ? Math.round(materia.apuntes.reduce((a, x) => a + x.dominio, 0) / materia.apuntes.length)
    : 0;

  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.style.maxHeight = open ? bodyRef.current.scrollHeight + "px" : "0px";
  }, [open]);

  return (
    <div className={`materia${open ? " open" : ""}`}>
      <div className="mhead" onClick={() => setOpen((o) => !o)}>
        <div className="mfld" style={{ background: `linear-gradient(135deg,${materia.color[0]},${materia.color[1]})` }}>
          {materia.icon}
        </div>
        <div>
          <div className="mname">{materia.name}</div>
          <div className="mcount">{materia.apuntes.length} apunte{materia.apuntes.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="mright">
          <span className="mpct" style={{ color: materia.color[1] }}>{avg}%</span>
          <span className="mchev">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      <div className="mbody" ref={bodyRef} style={{ maxHeight: open ? undefined : 0, overflow: "hidden", transition: "max-height .45s cubic-bezier(.22,1,.36,1)" }}>
        <div className="mbody-in">
          {materia.apuntes.map((a) => (
            <Link key={a.id} href={`/app/ia?note_id=${a.id}`} className="apunte">
              <ApunteRing pct={a.dominio} color={materia.color[1]} />
              <div>
                <div className="anm">{a.title}</div>
                <div className="asub">{a.dominio}% dominio</div>
              </div>
              <span className="aarw">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const GRADIENTS: [string, string][] = [
  ["#5b8cff", "#3f63ff"],
  ["#9a63f7", "#7c3aed"],
  ["#ff6b81", "#e4264f"],
  ["#34d399", "#10b981"],
  ["#f472b6", "#ec4899"],
  ["#2dd4bf", "#0d9488"],
];

const ICONS = [
  <svg key="0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>,
  <svg key="1" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2 2 7l10 5 10-5z" /><path d="m2 17 10 5 10-5M2 12l10 5 10-5" /></svg>,
  <svg key="2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0M5.58 16.5h12.85" /></svg>,
  <svg key="3" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>,
  <svg key="4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  <svg key="5" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></svg>,
];

type Props = {
  subjects: { id: string; name: string; color: string }[];
  notes: { id: string; subject_id: string | null; title: string; has_ai_content: boolean }[];
  onUpload: () => void;
};

export function MateriasAccordion({ subjects, notes, onUpload }: Props) {
  const materias: Materia[] = subjects.map((s, i) => {
    const apuntes = notes
      .filter((n) => n.subject_id === s.id)
      .map((n) => ({ id: n.id, title: n.title, dominio: n.has_ai_content ? 50 : 0 }));
    return {
      id: s.id,
      name: s.name,
      color: GRADIENTS[i % GRADIENTS.length],
      icon: ICONS[i % ICONS.length],
      apuntes,
    };
  });

  if (materias.length === 0) {
    return (
      <div className="materias" id="materias">
        <div className="empty-state">
          <img src="/bookisubirarchivocorrecto.png" alt="Booki" style={{ width: 150, filter: "drop-shadow(0 10px 18px rgba(99,60,220,.22))" }} />
          <h3>Todavía no tenés apuntes</h3>
          <p>Subí el primero y Booki te arma el resumen, las tarjetas y el simulacro.</p>
          <button className="ebtn" onClick={onUpload}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Subir mi primer apunte
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="materias" id="materias">
      {materias.map((m, i) => (
        <MateriaRow key={m.id} materia={m} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
