"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { shareNoteToCommunity } from "@/lib/api/notes";
import type { Note, Subject } from "@/lib/types";

const KINDS = [
  { value: "resumen", label: "Resumen" },
  { value: "apunte", label: "Apunte" },
  { value: "toma_notas", label: "Toma de notas" },
  { value: "parcial", label: "Examen parcial" },
  { value: "final", label: "Examen final" },
  { value: "otro", label: "Otro" },
];
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => NOW_YEAR - i);

const fieldCls =
  "w-full px-3 py-2.5 rounded-xl bg-paper border border-rule text-sm focus:outline-none focus:border-accent transition";
const labelCls = "block text-[11px] uppercase tracking-[0.1em] text-ink-soft font-semibold mb-1.5";

export function ShareModal({
  note,
  subjects,
  university,
  career,
  onClose,
}: {
  note: Note;
  subjects: Subject[];
  university: string | null;
  career: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [kind, setKind] = useState("apunte");
  const [uni, setUni] = useState(university ?? "");
  const [car, setCar] = useState(career ?? "");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState<string>(String(NOW_YEAR));
  const [month, setMonth] = useState<string>("");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const suggested = useMemo(
    () => [KIND_LABEL[kind], subject.trim(), year].filter(Boolean).join(" · "),
    [kind, subject, year],
  );
  useEffect(() => {
    if (!titleTouched) setTitle(suggested);
  }, [suggested, titleTouched]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function submit() {
    setErr(null);
    if (!title.trim()) {
      setErr("Ponele un título para que se encuentre fácil.");
      return;
    }
    setPending(true);
    try {
      await shareNoteToCommunity(note.id, {
        kind,
        university: uni,
        career: car,
        subject,
        year: year ? Number(year) : null,
        month: month ? Number(month) : null,
        title,
      });
      router.refresh();
      onClose();
    } catch (e) {
      const m = e instanceof Error ? e.message : "error";
      setErr(
        m === "skillio_generated"
          ? "Este PDF lo generó Skillio — no se puede compartir en la comunidad. Compartí tus apuntes originales 😉"
          : "No se pudo compartir. Probá de nuevo.",
      );
      setPending(false);
    }
  }

  const overlay = (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-skillio-fade-in p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-paper border border-rule shadow-lg flex flex-col"
        style={{ maxHeight: "calc(100dvh - 32px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-rule-soft shrink-0">
          <div>
            <div className="eyebrow">Compartir en la comunidad</div>
            <div className="font-display font-bold text-[15px] truncate max-w-[300px]">{note.file_name}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 rounded-full border border-rule hover:border-ink-soft transition flex items-center justify-center text-lg shrink-0"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{ overscrollBehavior: "contain" }}>
          <div>
            <label className={labelCls}>Tipo de material</label>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={fieldCls}>
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Universidad</label>
              <input value={uni} onChange={(e) => setUni(e.target.value)} placeholder="Ej: UBA" className={fieldCls} />
            </div>
            <div>
              <label className={labelCls}>Carrera</label>
              <input value={car} onChange={(e) => setCar(e.target.value)} placeholder="Ej: Ingeniería" className={fieldCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Materia</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              list="share-subjects"
              placeholder="Escribí o elegí una materia"
              className={fieldCls}
            />
            <datalist id="share-subjects">
              {subjects.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Año</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={fieldCls}>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
                <option value="">Sin año</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Mes <span className="text-ink-softer normal-case tracking-normal">(opcional)</span></label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={fieldCls}>
                <option value="">—</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Título</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }}
              placeholder="Título para que se encuentre fácil"
              className={fieldCls}
            />
            <p className="text-[11px] text-ink-softer mt-1">Sugerido automáticamente — editalo si querés.</p>
          </div>

          {err && (
            <div className="px-3.5 py-2.5 rounded-xl text-[12.5px]" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
              {err}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-rule-soft px-5 py-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-rule font-display font-semibold text-[13.5px] hover:bg-paper-warm transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 py-2.5 rounded-full bg-accent text-[#FBF1EF] font-display font-bold text-[13.5px] hover:bg-accent-hover transition disabled:opacity-60"
          >
            {pending ? "Compartiendo…" : "Compartir →"}
          </button>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(overlay, document.body) : null;
}
