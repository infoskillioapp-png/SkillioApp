import Link from "next/link";
import type { AgendaEvent } from "@/lib/types";

const KIND_TONE: Record<string, "accent" | "info" | "warning" | "success" | "danger"> = {
  class: "info",
  exam: "danger",
  midterm: "warning",
  tp: "accent",
  study: "success",
  other: "info",
};

const TONE_DOT: Record<string, string> = {
  accent: "bg-accent",
  info: "bg-info",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-danger",
};

function fmt(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AgendaPreview({ events }: { events: AgendaEvent[] }) {
  const tone = (kind: string) => KIND_TONE[kind] ?? "info";
  const isExam = (kind: string) => kind === "exam" || kind === "midterm";

  return (
    <div className="rounded-3xl bg-paper border border-rule-soft p-6 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="eyebrow">Hoy en agenda</div>
        <Link
          href="/app/agenda"
          className="text-[11.5px] text-ink-soft hover:text-accent underline underline-offset-2 transition"
        >
          ver semana →
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
          <div className="text-3xl mb-2 opacity-40">📅</div>
          <p className="text-[12.5px] text-ink-softer">
            Sin eventos para hoy.{" "}
            <Link href="/app/agenda" className="text-accent underline underline-offset-2">
              Agregar uno
            </Link>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => {
            const t = tone(ev.kind);
            const exam = isExam(ev.kind);
            return (
              <div
                key={ev.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-paper-warm transition"
              >
                <span className={`w-2 h-2 rounded-full ${TONE_DOT[t]} shrink-0`} />
                <span className="font-display font-semibold text-[13px] tabular-nums w-10">
                  {fmt(ev.starts_at)}
                </span>
                <span
                  className={`text-[13.5px] truncate flex-1 ${
                    exam ? "text-danger font-semibold" : ""
                  }`}
                >
                  {exam && "⚠ "}
                  {ev.title}
                </span>
                {ev.room && (
                  <span className="text-[11.5px] text-ink-soft hidden sm:inline">
                    {ev.room}
                  </span>
                )}
                {exam && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning-soft text-warning">
                    {ev.kind === "exam" ? "EXAMEN" : "PARCIAL"}
                  </span>
                )}
                {ev.kind === "tp" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-soft text-accent">
                    TP
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
