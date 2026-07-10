import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MateriasClient } from "./_components/materias-client";

export default async function MateriasPage() {
  // Clerk o sesión anónima (free). El invitado ve la sección (vacía hasta que
  // suba apuntes).
  const user = await getActorReadonly();
  if (!user) redirect("/app");

  const sb = supabaseAdmin();

  const [{ data: subjects }, { data: notes }] = await Promise.all([
    sb.from("subjects").select("id,name,color").eq("user_id", user.id).order("name"),
    sb.from("notes").select("id,subject_id,title,has_ai_content").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const materias = (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    apuntes: (notes ?? []).filter((n) => n.subject_id === s.id).map((n) => ({
      id: n.id,
      title: n.title,
      has_ai_content: n.has_ai_content,
    })),
  }));

  const sinMateria = (notes ?? []).filter((n) => !n.subject_id);
  if (sinMateria.length > 0) {
    materias.push({
      id: "sin-materia",
      name: "Sin materia",
      color: "#8b5cf6",
      apuntes: sinMateria.map((n) => ({ id: n.id, title: n.title, has_ai_content: n.has_ai_content })),
    });
  }

  return (
    <MateriasClient
      materias={materias}
      totalNotes={notes?.length ?? 0}
    />
  );
}
