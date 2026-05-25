"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNote, toggleNotePublic } from "@/lib/api/notes";
import type { Note } from "@/lib/types";

const TYPE_ICON: Record<string, { icon: string; tone: string }> = {
  pdf: { icon: "📄", tone: "bg-accent-soft text-accent" },
  image: { icon: "🖼", tone: "bg-success-soft text-success" },
  word: { icon: "📝", tone: "bg-info-soft text-info" },
  text: { icon: "📃", tone: "bg-warning-soft text-warning" },
  file: { icon: "📎", tone: "bg-paper-2 text-ink-soft" },
};

function formatBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un instante";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d}d`;
  return new Date(iso).toLocaleDateString("es-AR");
}

export function NoteRow({ note }: { note: Note }) {
  const router = useRouter();
  const [pendingDel, startDel] = useTransition();
  const [pendingPub, startPub] = useTransition();
  const meta = TYPE_ICON[note.file_type ?? "file"] ?? TYPE_ICON.file;

  function handleDelete() {
    if (!confirm(`¿Eliminar "${note.title}"?`)) return;
    startDel(async () => {
      await deleteNote(note.id);
      router.refresh();
    });
  }

  function handleTogglePublic() {
    startPub(async () => {
      await toggleNotePublic(note.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-paper border border-rule-soft hover:border-rule transition">
      <span className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${meta.tone}`}>
        {meta.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="font-display font-semibold text-[15px] truncate">
          {note.title}
        </div>
        <div className="text-[11.5px] text-ink-soft truncate">
          {formatBytes(note.file_size_bytes)} · {timeAgo(note.created_at)}
          {note.is_public && (
            <span className="ml-2 text-accent font-semibold">· público</span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 shrink-0">
        <a
          href={`/api/notes/${note.id}/download`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 rounded-full border border-rule text-[12px] font-medium hover:border-ink-soft hover:text-ink transition"
        >
          Abrir
        </a>
        <button
          type="button"
          onClick={handleTogglePublic}
          disabled={pendingPub}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
            note.is_public
              ? "bg-accent text-[#FBF1EF] hover:bg-accent-hover"
              : "border border-rule hover:border-accent hover:text-accent"
          }`}
        >
          {note.is_public ? "Compartido ✓" : "Compartir"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pendingDel}
          className="w-8 h-8 rounded-full border border-rule-soft hover:border-danger hover:text-danger transition flex items-center justify-center"
          aria-label="Eliminar"
          title="Eliminar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-3.5 h-3.5">
            <path d="M3 6h18M8 6V4h8v2m-1 0v14H9V6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
