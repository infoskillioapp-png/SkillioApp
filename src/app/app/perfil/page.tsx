import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PerfilClient } from "./_components/perfil-client";

export default async function PerfilPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const [clerkUser, sb] = [await currentUser(), supabaseAdmin()];

  const { data: user } = await sb
    .from("users")
    .select("id,full_name,plan,created_at,expires_at")
    .eq("clerk_user_id", userId)
    .single();
  if (!user) redirect("/login");

  const [{ count: notesCount }, { count: subjectsCount }, { count: aiCount }] = await Promise.all([
    sb.from("notes").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("subjects").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    sb.from("ai_outputs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const planLabel: Record<string, string> = {
    free: "Plan Gratuito",
    semanal: "Plan Semanal",
    pro: "Plan Mensual PRO",
    free_trial: "Trial 24hs",
  };

  return (
    <PerfilClient
      name={user.full_name ?? clerkUser?.firstName ?? "Estudiante"}
      email={clerkUser?.emailAddresses[0]?.emailAddress ?? ""}
      plan={user.plan ?? "free"}
      planLabel={planLabel[user.plan ?? "free"] ?? user.plan}
      expiresAt={user.expires_at ?? null}
      memberSince={user.created_at}
      stats={{
        notes: notesCount ?? 0,
        subjects: subjectsCount ?? 0,
        aiGenerations: aiCount ?? 0,
      }}
    />
  );
}
