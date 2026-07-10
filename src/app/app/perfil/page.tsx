import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PerfilClient } from "./_components/perfil-client";

export default async function PerfilPage() {
  // Clerk o sesión anónima (free). El invitado ve su perfil (sin mail/nombre
  // hasta que cree la cuenta al pagar).
  const user = await getActorReadonly();
  if (!user) redirect("/app");

  const { userId } = await auth();
  const clerkUser = userId ? await currentUser() : null;
  const sb = supabaseAdmin();

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
