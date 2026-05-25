import Link from "next/link";
import { listSubjects } from "@/lib/api/subjects";
import { listNotes } from "@/lib/api/notes";
import { Uploader } from "./_components/uploader";
import { NoteRow } from "./_components/note-row";

export default async function ApuntesPage() {
  const [notes, subjects] = await Promise.all([listNotes(), listSubjects()]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <header className="mb-8">
        <div className="eyebrow mb-1.5">Mis apuntes</div>
        <h1 className="font-display font-extrabold text-4xl tracking-[-0.03em] mb-3">
          Tu <span className="italic text-accent">biblioteca.</span>
        </h1>
        <p className="text-sm text-ink-soft max-w-xl">
          Subí PDFs, imágenes o documentos. Asociá cada uno a una materia para
          tenerlos ordenados y, si querés, compartilos con la comunidad.
        </p>
      </header>

      <div className="mb-8">
        <Uploader subjects={subjects} />
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-xl">Subidos</h2>
          <span className="text-[12.5px] text-ink-soft">
            {notes.length} {notes.length === 1 ? "archivo" : "archivos"}
          </span>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-rule bg-paper-warm p-12 text-center">
            <div className="text-4xl mb-3 opacity-60">📁</div>
            <p className="text-sm text-ink-soft">
              Todavía no subiste apuntes. Arrastrá uno arriba para empezar.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notes.map((n) => (
              <NoteRow key={n.id} note={n} />
            ))}
          </div>
        )}
      </section>

      {/* Banner Pro */}
      <div className="mt-12 rounded-3xl bg-accent-softer border border-accent/20 p-7 flex flex-wrap items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-accent text-[#FBF1EF] flex items-center justify-center text-xl">
          ✨
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="font-display font-bold text-lg">
            Convertí tus apuntes en flashcards y tests con IA
          </div>
          <p className="text-[12.5px] text-ink-soft">
            Pasate a Pro y desbloqueá Claude Opus 4.7 para resumir, generar
            simulacros de examen y crear mazos de repaso espaciado.
          </p>
        </div>
        <Link
          href="/app/ia"
          className="px-5 py-2.5 rounded-full bg-accent text-white font-display font-bold text-sm hover:bg-accent-hover transition"
        >
          Ver IA Premium →
        </Link>
      </div>
    </div>
  );
}
