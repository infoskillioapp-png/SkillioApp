"use client";

import { useState } from "react";
import { SubjectCard } from "./subject-card";
import { SubjectForm } from "./subject-form";
import type { Subject } from "@/lib/types";

export function SubjectsView({ subjects }: { subjects: Subject[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(s: Subject) {
    setEditing(s);
    setOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-7">
        <div>
          <div className="eyebrow mb-1.5">{subjects.length} materias</div>
          <h1 className="font-display font-extrabold text-4xl tracking-[-0.03em]">
            Todo lo que <span className="italic text-accent">cursás.</span>
          </h1>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="px-5 py-3 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-sm shadow-[0_8px_24px_var(--accent-glow)] hover:bg-accent-hover transition"
        >
          + Nueva materia
        </button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState onAdd={openNew} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subjects.map((s) => (
            <SubjectCard key={s.id} subject={s} onEdit={openEdit} />
          ))}
        </div>
      )}

      <SubjectForm
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-rule bg-paper-warm p-14 text-center">
      <div className="text-5xl mb-4 opacity-60">📚</div>
      <h2 className="font-display font-bold text-xl mb-2">Todavía no tenés materias</h2>
      <p className="text-sm text-ink-soft max-w-sm mx-auto mb-6">
        Cargá las materias que estás cursando para ver el progreso, llevar la
        agenda y vincular tus apuntes.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="px-5 py-2.5 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-sm hover:bg-accent-hover transition"
      >
        Sumar primera materia
      </button>
    </div>
  );
}
