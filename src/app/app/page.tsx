import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPaidPlan } from "@/lib/ai/claude";
import { getUsageSnapshot, type UsageSnapshot } from "@/lib/ai/usage";
import { HomeClient } from "./_components/home-client";

type SearchParams = Promise<{ upload?: string; upgrade?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const { upload, upgrade } = await searchParams;

  // Identidad: usuario de Clerk o sesión anónima (registro diferido). El
  // invitado es un free completo — ve la misma home. Un invitado nuevo (sin
  // cookie todavía) no tiene actor: mostramos la home vacía con el modal abierto.
  const actor = await getActorReadonly();

  let subjects: { id: string; name: string; color: string }[] = [];
  let notes: { id: string; subject_id: string | null; title: string; has_ai_content: boolean }[] = [];
  let usage: UsageSnapshot | null = null;

  if (actor) {
    const sb = supabaseAdmin();
    const [subRes, noteRes] = await Promise.all([
      sb.from("subjects").select("id,name,color").eq("user_id", actor.id).order("created_at", { ascending: true }),
      sb.from("notes").select("id,subject_id,title,has_ai_content").eq("user_id", actor.id).order("created_at", { ascending: false }),
    ]);
    subjects = subRes.data ?? [];
    notes = noteRes.data ?? [];
    // Indicador de límite de apuntes (solo planes pagos, igual que en Perfil).
    if (isPaidPlan(actor.plan, actor.expires_at)) usage = await getUsageSnapshot(actor.id);
  }

  const firstName = actor?.full_name?.split(" ")[0] ?? "Estudiante";
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
      subjects={subjects}
      notes={notes}
      usage={usage}
      // Invitado nuevo (sin actor): abrimos el modal directo para que suba.
      autoUpload={upload === "1" || !actor}
      autoUpgrade={["semanal", "mensual", "trimestral"].includes(upgrade ?? "") ? (upgrade as "semanal" | "mensual" | "trimestral") : null}
    />
  );
}
