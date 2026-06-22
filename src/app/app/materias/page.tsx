import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { MateriasClient } from "./_components/materias-client";

export default async function MateriasPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const sb = supabaseAdmin();
  const { data: user } = await sb.from("users").select("id").eq("clerk_user_id", userId).single();
  if (!user) redirect("/login");

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
