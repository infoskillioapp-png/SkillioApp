"use client";

import { useEffect, useState, useTransition } from "react";
import { upsertEvent, type EventInput } from "@/lib/api/events";
import type { AgendaEvent, EventKind, Subject } from "@/lib/types";

const KIND_OPTIONS: { value: EventKind; label: string; tone: string }[] = [
  { value: "class", label: "Clase", tone: "bg-accent-soft text-accent" },
  { value: "exam", label: "Examen", tone: "bg-danger/15 text-danger" },
  { value: "midterm", label: "Parcial", tone: "bg-warning-soft text-warning" },
  { value: "tp", label: "TP", tone: "bg-info-soft text-info" },
  { value: "study", label: "Estudio", tone: "bg-success-soft text-success" },
  { value: "other", label: "Otro", tone: "bg-paper-2 text-ink-soft" },
];

type Props = {
  open: boolean;
  editing: AgendaEvent | null;
  subjects: Subject[];
  defaultDate?: string;
  onClose: () => void;
};

function isoToDate(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}
function isoToTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function EventForm({ open, editing, subjects, defaultDate, onClose }: Props) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [subjectId, setSubjectId] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("class");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [room, setRoom] = useState("");
  const [professor, setProfessor] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr(null);
    if (editing) {
      setSubjectId(editing.subject_id ?? "");
      setTitle(editing.title);
      setKind(editing.kind);
      setDate(isoToDate(editing.starts_at));
      setStartTime(isoToTime(editing.starts_at));
      setEndTime(editing.ends_at ? isoToTime(editing.ends_at) : "");
      setRoom(editing.room ?? "");
      setProfessor(editing.professor ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setSubjectId(subjects[0]?.id ?? "");
      setTitle("");
      setKind("class");
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setStartTime("09:00");
      setEndTime("");
      setRoom("");
      setProfessor("");
      setNotes("");
    }
  }, [editing, open, defaultDate, subjects]);

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
    const input: EventInput = {
      id: editing?.id,
      subject_id: subjectId,
      title,
      kind,
      date,
      start_time: startTime,
      end_time: endTime,
      room,
      professor,
      notes,
    };
    startTransition(async () => {
      try {
        await upsertEvent(input);
        onClose();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "error");
      }
    });
  }

  const subjectColor =
    subjects.find((s) => s.id === subjectId)?.color ?? "var(--accent)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-skillio-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-[560px] max-w-[92vw] rounded-3xl bg-paper border border-rule shadow-lg overflow-hidden"
      >
        <div className="h-1.5" style={{ background: subjectColor }} />
        <div className="p-7 max-h-[80vh] overflow-y-auto">
          <div className="eyebrow mb-1">{editing ? "Editar evento" : "Nuevo evento"}</div>
          <h2 className="font-display font-extrabold text-2xl tracking-[-0.02em] mb-6">
            {editing ? editing.title : "Agendar algo"}
          </h2>

          <Field label="Título *">
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Clase de Análisis Matemático"
              className="ag-input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Materia">
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="ag-input"
              >
                <option value="">— sin materia —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tipo">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as EventKind)}
                className="ag-input"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-3">
            <Field label="Fecha *">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="ag-input"
              />
            </Field>
            <Field label="Desde *">
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="ag-input"
              />
            </Field>
            <Field label="Hasta">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="ag-input"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <Field label="Aula">
              <input
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="Aula 207"
                className="ag-input"
              />
            </Field>
            <Field label="Profesor">
              <input
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                placeholder="Dr. Pérez"
                className="ag-input"
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Notas">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Algo que quieras recordar…"
                className="ag-input resize-none"
              />
            </Field>
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
              {pending ? "Guardando…" : editing ? "Guardar" : "Agendar"}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        .ag-input {
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
        .ag-input:focus { border-color: var(--accent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] uppercase tracking-[0.14em] text-ink-soft font-semibold mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
