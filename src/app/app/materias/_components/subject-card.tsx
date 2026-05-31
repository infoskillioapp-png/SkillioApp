"use client";

import { useTransition, useState } from "react";
import { deleteSubject } from "@/lib/api/subjects";
import type { Subject } from "@/lib/types";

type Props = {
  subject: Subject;
  onEdit: (s: Subject) => void;
};

export function SubjectCard({ subject, onEdit }: Props) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteSubject(subject.id);
      setConfirming(false);
    });
  }

  const promedio = subject.avg_grade ?? null;
  const promedioLow = promedio !== null && promedio < 6;

  return (
    <div
      className="group relative rounded-3xl bg-paper border border-rule-soft p-6 transition hover:border-rule hover:-translate-y-[1px] hover:shadow-card"
      style={{ borderLeft: `4px solid ${subject.color}` }}
    >
      {/* Acciones */}
      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          type="button"
          onClick={() => onEdit(subject)}
          className="w-8 h-8 rounded-full border border-rule-soft bg-paper-warm hover:border-accent hover:text-accent transition flex items-center justify-center"
          aria-label="Editar"
          title="Editar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-3.5 h-3.5">
            <path d="M14 4l6 6L8 22H2v-6L14 4z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-8 h-8 rounded-full border border-rule-soft bg-paper-warm hover:border-danger hover:text-danger transition flex items-center justify-center"
          aria-label="Eliminar"
          title="Eliminar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-3.5 h-3.5">
            <path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {subject.code && (
        <div className="text-[10.5px] uppercase tracking-[0.14em] text-ink-softer mb-1">
          {subject.code}
        </div>
      )}
      <h3 className="font-display font-bold text-xl tracking-[-0.02em] mb-1 pr-16">
        {subject.name}
      </h3>
      {subject.professor && (
        <div className="text-[12.5px] text-ink-soft mb-5">
          {subject.professor}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Stat
          label="Promedio"
          value={promedio !== null ? promedio.toFixed(2) : "—"}
          accent={promedioLow ? "text-danger" : ""}
        />
        <Stat
          label="Asistencia"
          value={`${subject.attendance_pct}%`}
        />
      </div>

      <div className="h-1 rounded-full bg-rule-soft overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, subject.attendance_pct)}%`,
            background: subject.color,
          }}
        />
      </div>

      {/* Modal de confirmación de borrado */}
      {confirming && (
        <div
          className="absolute inset-0 rounded-3xl bg-paper/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-skillio-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-3xl mb-2">🗑</div>
          <div className="font-display font-bold text-base mb-1 text-center">
            ¿Eliminar {subject.name}?
          </div>
          <p className="text-[12px] text-ink-soft text-center mb-4">
            Sus eventos y notas asociados quedan sin materia.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-4 py-1.5 rounded-full border border-rule text-[12.5px] font-medium hover:border-ink-soft transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="px-4 py-1.5 rounded-full bg-danger text-[#FBF1EF] text-[12.5px] font-display font-semibold hover:bg-accent-hover transition disabled:opacity-50"
            >
              {pending ? "Borrando…" : "Sí, eliminar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.1em] text-ink-softer mb-0.5">
        {label}
      </div>
      <div className={`font-display font-bold text-2xl num tracking-[-0.02em] ${accent ?? ""}`}>
        {value}
      </div>
    </div>
  );
}
