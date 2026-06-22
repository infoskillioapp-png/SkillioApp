import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LogrosClient } from "./_components/logros-client";

export default async function LogrosPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const sb = supabaseAdmin();
  const { data: user } = await sb.from("users").select("id,full_name,created_at").eq("clerk_user_id", userId).single();
  if (!user) redirect("/login");

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
