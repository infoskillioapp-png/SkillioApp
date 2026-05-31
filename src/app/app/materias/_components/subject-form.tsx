"use client";

import { useEffect, useState, useTransition } from "react";
import { upsertSubject } from "@/lib/api/subjects";
import { SUBJECT_COLORS, type Subject } from "@/lib/types";

type Props = {
  open: boolean;
  editing: Subject | null;
  onClose: () => void;
};

export function SubjectForm({ open, editing, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [professor, setProfessor] = useState("");
  const [color, setColor] = useState<string>(SUBJECT_COLORS[0].value);
  const [attendance, setAttendance] = useState("100");
  const [exam1Grade, setExam1Grade] = useState("");
  const [exam2Grade, setExam2Grade] = useState("");
  const [exam3Grade, setExam3Grade] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (editing) {
      setCode(editing.code ?? "");
      setName(editing.name);
      setProfessor(editing.professor ?? "");
      setColor(editing.color);
      setAttendance(String(editing.attendance_pct ?? 100));
      setExam1Grade(editing.exam1_grade !== null ? String(editing.exam1_grade) : "");
      setExam2Grade(editing.exam2_grade !== null ? String(editing.exam2_grade) : "");
      setExam3Grade(editing.exam3_grade !== null ? String(editing.exam3_grade) : "");
    } else {
      setCode("");
      setName("");
      setProfessor("");
      setColor(SUBJECT_COLORS[0].value);
      setAttendance("100");
      setExam1Grade("");
      setExam2Grade("");
      setExam3Grade("");
    }
  }, [editing, open]);

  // Esc cierra
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        await upsertSubject({
          id: editing?.id,
          code,
          name,
          professor,
          color,
          attendance_pct: attendance,
          exam1_grade: exam1Grade,
          exam2_grade: exam2Grade,
          exam3_grade: exam3Grade,
        });
        onClose();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "error desconocido";
        setErr(msg);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[92vw] rounded-3xl bg-paper border border-rule shadow-lg overflow-hidden"
      >
        <div className="h-1.5" style={{ background: color }} />
        <div className="p-7">
          <div className="eyebrow mb-1">{editing ? "Editar materia" : "Nueva materia"}</div>
          <h2 className="font-display font-extrabold text-2xl tracking-[-0.02em] mb-6">
            {editing ? editing.name : "Sumá una materia"}
          </h2>

          <div className="grid grid-cols-3 gap-3 mb-3">
            <Field label="Código">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="MAT201"
                className="input"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Nombre *">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Análisis Matemático II"
                  className="input"
                />
              </Field>
            </div>
          </div>

          <Field label="Profesor">
            <input
              value={professor}
              onChange={(e) => setProfessor(e.target.value)}
              placeholder="Dr. Pérez"
              className="input"
            />
          </Field>

          <div className="mt-4 mb-3">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold mb-2">
              Color
            </div>
            <div className="flex flex-wrap gap-2">
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition ${color === c.value ? "border-ink scale-110" : "border-rule-soft hover:scale-105"}`}
                  style={{ background: c.value }}
                  aria-label={c.label}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <Field label="Asistencia %">
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                className="input"
              />
            </Field>
            <div className="flex items-end pb-1">
              <p className="text-[11.5px] text-ink-softer leading-snug">
                El promedio se calcula automáticamente a partir de las notas de los exámenes.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold mb-2">
              Fechas de exámenes
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Examen 1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={exam1Grade}
                  onChange={(e) => setExam1Grade(e.target.value)}
                  placeholder="7.5"
                  className="input"
                />
              </Field>
              <Field label="Examen 2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={exam2Grade}
                  onChange={(e) => setExam2Grade(e.target.value)}
                  placeholder="7.5"
                  className="input"
                />
              </Field>
              <Field label="Examen 3">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={exam3Grade}
                  onChange={(e) => setExam3Grade(e.target.value)}
                  placeholder="7.5"
                  className="input"
                />
              </Field>
            </div>
          </div>

          {err && (
            <div className="mt-4 p-3 rounded-xl bg-accent-soft text-accent text-[12.5px]">
              {err}
            </div>
          )}

          <div className="mt-7 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-rule text-sm font-medium hover:border-ink-soft transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-6 py-2.5 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-sm hover:bg-accent-hover transition disabled:opacity-60"
            >
              {pending ? "Guardando…" : editing ? "Guardar cambios" : "Crear materia"}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .input {
          width: 100%;
          padding: 10px 12px;
          background: var(--paper-warm);
          border: 0.5px solid var(--rule);
          border-radius: 10px;
          font-size: 14px;
          color: var(--ink);
          outline: none;
          transition: border-color .2s;
        }
        .input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
