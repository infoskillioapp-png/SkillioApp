import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { listSubjects } from "@/lib/api/subjects";
import { listNotes } from "@/lib/api/notes";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HomeClient } from "./_components/home-client";

type SearchParams = Promise<{ upload?: string; upgrade?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { upload, upgrade } = await searchParams;

  // Invitado (registro diferido): home limpia con el modal de subir abierto. No
  // cargamos datos que asumen cuenta de Clerk.
  const { userId } = await auth();
  if (!userId) {
    // Si ya generó su resumen gratis, lo llevamos a su resultado (no puede
    // volver a generar).
    const guest = await getActorReadonly();
    if (guest) {
      const { data: out } = await supabaseAdmin()
        .from("ai_outputs")
        .select("note_id")
        .eq("user_id", guest.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (out?.note_id) redirect(`/app/ia/resumen?note_id=${out.note_id}`);
    }
    return (
      <HomeClient
        user={{ firstName: "Estudiante", initial: "E" }}
        lastNote={null}
        subjects={[]}
        notes={[]}
        autoUpload
        isGuest
      />
    );
  }

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
      autoUpgrade={["semanal", "mensual", "trimestral"].includes(upgrade ?? "") ? (upgrade as "semanal" | "mensual" | "trimestral") : null}
    />
  );
}
