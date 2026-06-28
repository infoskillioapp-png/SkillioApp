import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { syncUserToSupabase } from "@/lib/sync-user";
import { checkEmailAllowed } from "@/lib/anti-fraude";
import { applyReferral } from "@/lib/api/referrals";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendWelcomeEmail, scheduleNudgeEmails } from "@/lib/email/resend";

interface Props {
  searchParams: Promise<{ ref?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { userId } = await auth();
  if (!userId) redirect("/login");

  // Anti-fraude: mail temporal o Gmail duplicado
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? null;
  if (email) {
    const verdict = await checkEmailAllowed(userId, email);
    if (verdict !== "ok") redirect(`/bloqueado?reason=${verdict}`);
  }

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  // Si ya completó el onboarding, va directo al app
  if (user.onboarding_completed) redirect("/app");

  await applyReferral(user, sp.ref);

  // Auto-completar: nombre ya viene de Google, no necesitamos el formulario
  const sb = supabaseAdmin();
  await sb.from("users").update({
    onboarding_completed: true,
    demo_completed: true,
    offer_started_at: new Date().toISOString(),
  }).eq("clerk_user_id", userId);

  // Emails de bienvenida y nurture
  if (user.email) {
    await sendWelcomeEmail(user.email, user.full_name);
    await scheduleNudgeEmails(user.email, user.full_name);
  }

  // Nuevo usuario cae en el home con el modal de subir archivo abierto
  redirect("/app?upload=1");
}
