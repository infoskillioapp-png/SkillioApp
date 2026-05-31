"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/lib/api/profile";
import type { SkillioUser } from "@/lib/sync-user";

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function partOfDay(h: number) {
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function InlineField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    onSave(draft);
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.12em] text-ink-softer font-semibold">
        {label}:
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="text-sm text-ink bg-transparent border-b border-accent outline-none px-0.5 min-w-[120px]"
          placeholder={placeholder}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true); }}
          className="text-sm text-ink hover:text-accent transition"
          title="Click para editar"
        >
          {value || <span className="text-ink-softer italic">{placeholder}</span>}
        </button>
      )}
    </div>
  );
}

export function Greeting({ user }: { user: SkillioUser }) {
  const [, startTransition] = useTransition();
  const [career, setCareer] = useState(user.career ?? "");
  const [institution, setInstitution] = useState(user.institution ?? "");

  const now = new Date();
  const firstName = user.full_name?.split(" ")[0] ?? user.email.split("@")[0];
  const dateStr = `${DAYS[now.getDay()]} ${now.getDate()} de ${MONTHS[now.getMonth()]}`;

  function saveCareer(v: string) {
    setCareer(v);
    startTransition(() => updateProfile({ career: v }));
  }
  function saveInstitution(v: string) {
    setInstitution(v);
    startTransition(() => updateProfile({ institution: v }));
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 mb-9">
      <div>
        <div className="eyebrow mb-2">Hoy</div>
        <h1 className="font-display font-extrabold text-4xl sm:text-[44px] tracking-[-0.03em] leading-[1.05]">
          {partOfDay(now.getHours())},{" "}
          <span className="italic text-accent">{firstName}.</span>
        </h1>
        <p className="text-sm text-ink-soft mt-2 capitalize mb-3">{dateStr}</p>
        <div className="flex flex-col gap-1.5">
          <InlineField
            label="Carrera"
            value={career}
            placeholder="Ej: Ingeniería en Sistemas"
            onSave={saveCareer}
          />
          <InlineField
            label="Universidad"
            value={institution}
            placeholder="Ej: UTN, UBA, UADE…"
            onSave={saveInstitution}
          />
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-accent-soft border border-rule-soft text-accent text-[12.5px] font-semibold">
        🔥 {user.current_streak} {user.current_streak === 1 ? "día" : "días"} seguidos
      </div>
    </header>
  );
}
