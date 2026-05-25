"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent } from "@/lib/api/events";
import { EventForm } from "./event-form";
import type { AgendaEvent, Subject } from "@/lib/types";

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dayKey(iso: string) {
  return iso.slice(0, 10);
}
function timeStr(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // 0 = lun
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

const KIND_LABEL: Record<string, string> = {
  class: "Clase",
  exam: "Examen",
  midterm: "Parcial",
  tp: "TP",
  study: "Estudio",
  other: "",
};

export function AgendaView({
  events,
  subjects,
}: {
  events: AgendaEvent[];
  subjects: Subject[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [pending, startDel] = useTransition();

  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects],
  );

  // Mapa por dia (YYYY-MM-DD) -> eventos
  const byDay = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const k = dayKey(e.starts_at);
      const list = m.get(k) ?? [];
      list.push(e);
      m.set(k, list);
    }
    for (const list of m.values())
      list.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return m;
  }, [events]);

  // Semana corriente partiendo del lunes
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const selectedKey = toDateInput(selectedDate);
  const todaysEvents = byDay.get(selectedKey) ?? [];
  const today = new Date();
  const todayKey = toDateInput(today);

  function openNew(date?: Date) {
    setEditing(null);
    setSelectedDate(date ?? selectedDate);
    setOpen(true);
  }
  function openEdit(ev: AgendaEvent) {
    setEditing(ev);
    setOpen(true);
  }
  function handleDelete(ev: AgendaEvent) {
    if (!confirm(`¿Eliminar "${ev.title}"?`)) return;
    startDel(async () => {
      await deleteEvent(ev.id);
      router.refresh();
    });
  }

  function shiftWeek(weeks: number) {
    setSelectedDate(addDays(selectedDate, weeks * 7));
  }

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <div className="eyebrow mb-1.5">Agenda</div>
          <h1 className="font-display font-extrabold text-4xl tracking-[-0.03em]">
            Tu semana <span className="italic text-accent">en orden.</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={() => openNew()}
          className="px-5 py-3 rounded-full bg-accent text-[#FBF1EF] font-display font-semibold text-sm shadow-[0_8px_24px_var(--accent-glow)] hover:bg-accent-hover transition"
        >
          + Nuevo evento
        </button>
      </header>

      {/* Mini calendario semanal */}
      <div className="rounded-3xl bg-paper border border-rule-soft p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display font-bold text-base">
            {weekStart.toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="w-8 h-8 rounded-full border border-rule-soft hover:border-ink-soft transition flex items-center justify-center"
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="px-3 h-8 rounded-full border border-rule-soft text-[12px] hover:border-ink-soft transition"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="w-8 h-8 rounded-full border border-rule-soft hover:border-ink-soft transition flex items-center justify-center"
              aria-label="Semana próxima"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((d, i) => {
            const k = toDateInput(d);
            const isToday = k === todayKey;
            const isSelected = k === selectedKey;
            const count = byDay.get(k)?.length ?? 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`relative rounded-2xl p-2 text-center transition border ${
                  isSelected
                    ? "bg-accent text-[#FBF1EF] border-accent"
                    : isToday
                      ? "border-accent/40 bg-accent-softer hover:bg-accent-soft"
                      : "border-rule-soft bg-bg hover:border-rule"
                }`}
              >
                <div className="text-[10.5px] uppercase tracking-[0.1em] opacity-70">
                  {DAY_NAMES[i]}
                </div>
                <div className="font-display font-bold text-lg leading-none mt-0.5">
                  {d.getDate()}
                </div>
                {count > 0 && (
                  <div
                    className={`mt-1 w-1 h-1 mx-auto rounded-full ${
                      isSelected ? "bg-[#FBF1EF]" : "bg-accent"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de eventos del dia seleccionado */}
      <div className="rounded-3xl bg-paper border border-rule-soft p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl">
            {selectedDate.toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          <span className="text-[12.5px] text-ink-soft">
            {todaysEvents.length} eventos
          </span>
        </div>

        {todaysEvents.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-2 opacity-60">🗓</div>
            <p className="text-sm text-ink-soft mb-4">
              No tenés nada agendado para este día.
            </p>
            <button
              type="button"
              onClick={() => openNew(selectedDate)}
              className="px-4 py-2 rounded-full border border-rule hover:border-accent hover:text-accent transition text-[12.5px] font-medium"
            >
              + Agregar evento
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysEvents.map((ev) => {
              const subj = ev.subject_id ? subjectById.get(ev.subject_id) : null;
              const color = subj?.color ?? "var(--accent)";
              const isExam = ev.kind === "exam" || ev.kind === "midterm";
              return (
                <div
                  key={ev.id}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-paper-warm border-l-4 transition hover:bg-bg"
                  style={{ borderLeftColor: color }}
                >
                  <div className="w-14 text-right shrink-0">
                    <div className="font-display font-bold text-[15px] tabular-nums">
                      {timeStr(ev.starts_at)}
                    </div>
                    {ev.ends_at && (
                      <div className="text-[10.5px] text-ink-softer">
                        a {timeStr(ev.ends_at)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-semibold text-[15px] truncate">
                        {isExam && "⚠ "}
                        {ev.title}
                      </div>
                      {ev.kind !== "other" && (
                        <span
                          className={`text-[9.5px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded font-bold ${
                            isExam
                              ? "bg-danger/15 text-danger"
                              : "bg-paper-2 text-ink-soft"
                          }`}
                        >
                          {KIND_LABEL[ev.kind]}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-ink-soft flex gap-3 flex-wrap mt-0.5">
                      {subj && <span>{subj.name}</span>}
                      {ev.room && <span>· {ev.room}</span>}
                      {ev.professor && <span>· {ev.professor}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      className="w-7 h-7 rounded-full border border-rule-soft hover:border-accent hover:text-accent flex items-center justify-center text-xs"
                      aria-label="Editar"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ev)}
                      disabled={pending}
                      className="w-7 h-7 rounded-full border border-rule-soft hover:border-danger hover:text-danger flex items-center justify-center text-xs"
                      aria-label="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EventForm
        open={open}
        editing={editing}
        subjects={subjects}
        defaultDate={selectedKey}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
