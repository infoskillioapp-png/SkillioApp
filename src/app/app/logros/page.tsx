import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LogrosClient } from "./_components/logros-client";

export default async function LogrosPage() {
  // Clerk o sesión anónima (free).
  const user = await getActorReadonly();
  if (!user) redirect("/app");

  const sb = supabaseAdmin();

  const [{ count: notesCount }, { count: subjectsCount }, { count: aiCount }] = await Promise.all([
    sb.from("notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("subjects").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("ai_outputs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const stats = {
    notes: notesCount ?? 0,
    subjects: subjectsCount ?? 0,
    aiGenerations: aiCount ?? 0,
    racha: 0, // sin tracking diario por ahora
  };

  return <LogrosClient stats={stats} userName={user.full_name ?? "Estudiante"} />;
}
