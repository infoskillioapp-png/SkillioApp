import { syncUserToSupabase } from "@/lib/sync-user";
import { listSubjects } from "@/lib/api/subjects";
import { listNotes } from "@/lib/api/notes";
import { HomeClient } from "./_components/home-client";

type SearchParams = Promise<{ upload?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { upload } = await searchParams;

  const [user, subjects, notes] = await Promise.all([
    syncUserToSupabase(),
    listSubjects(),
    listNotes(),
  ]);

  const firstName = user?.full_name?.split(" ")[0] ?? "Estudiante";
  const initial = firstName[0]?.toUpperCase() ?? "E";

  const lastRawNote = notes[0] ?? null;
  const lastNote = lastRawNote
    ? {
        id: lastRawNote.id,
        subjectName: subjects.find((s) => s.id === lastRawNote.subject_id)?.name ?? "Sin materia",
        title: lastRawNote.title,
        dominio: lastRawNote.has_ai_content ? 50 : 0,
      }
    : null;

  return (
    <HomeClient
      user={{ firstName, initial }}
      lastNote={lastNote}
      subjects={subjects.map((s) => ({ id: s.id, name: s.name, color: s.color }))}
      notes={notes.map((n) => ({ id: n.id, subject_id: n.subject_id, title: n.title, has_ai_content: n.has_ai_content }))}
      autoUpload={upload === "1"}
    />
  );
}
