"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { sendWelcomeEmail, scheduleNudgeEmails } from "@/lib/email/resend";

// Normaliza el teléfono para comparar/guardar: deja solo dígitos y un '+' inicial.
// Así "11 2345-6789", "(11) 23456789" y "1123456789" se tratan como el mismo número.
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const fullName = (formData.get("full_name") as string)?.trim();
  const age = parseInt(formData.get("age") as string, 10);
  const institution = (formData.get("institution") as string)?.trim();
  const career = (formData.get("career") as string)?.trim();
  const phone = normalizePhone((formData.get("phone") as string) ?? "");

  // El teléfono debe tener al menos 8 dígitos (anti números de relleno tipo "0000").
  const phoneDigits = phone.replace(/\D/g, "");

  if (
    !fullName ||
    !institution ||
    !career ||
    isNaN(age) ||
    age < 10 ||
    age > 100 ||
    phoneDigits.length < 8
  ) {
    redirect("/onboarding?error=invalid");
  }

  const sb = supabaseAdmin();

  // Anti-fraude: un teléfono no puede estar en otra cuenta.
  const { data: existingPhone } = await sb
    .from("users")
    .select("clerk_user_id")
    .eq("phone", phone)
    .neq("clerk_user_id", userId)
    .maybeSingle();

  if (existingPhone) {
    redirect("/onboarding?error=phone_taken");
  }

  const { data: updated, error } = await sb
    .from("users")
    .update({
      full_name: fullName,
      age,
      institution,
      career,
      phone,
      onboarding_completed: true,
      // Arranca el cronómetro de 12h de la oferta de lanzamiento. completeOnboarding
      // corre una sola vez por usuario (la página redirige a /app si ya está hecho),
      // así que este timestamp no se pisa.
      offer_started_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId)
    .select("email, full_name")
    .maybeSingle();

  if (error) {
    // El índice único de phone es el guardia real ante carreras: si dos cuentas
    // mandan el mismo número a la vez, una falla acá (código 23505).
    if (error.code === "23505") {
      redirect("/onboarding?error=phone_taken");
    }
    console.error("[onboarding] update error:", error);
    redirect("/onboarding?error=invalid");
  }

  // Secuencia de nurture: mail de bienvenida ya + programados (+2h, hora 20).
  // Los helpers nunca lanzan (si Resend falla, loguea y sigue).
  if (updated?.email) {
    await sendWelcomeEmail(updated.email, updated.full_name);
    await scheduleNudgeEmails(updated.email, updated.full_name);
  }

  // ?registered=1 → RegistrationSuccess dispara el evento de Registro al Pixel.
  redirect("/app?registered=1");
}
