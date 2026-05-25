"use server";

import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const fullName = (formData.get("full_name") as string)?.trim();
  const age = parseInt(formData.get("age") as string, 10);
  const institution = (formData.get("institution") as string)?.trim();

  if (!fullName || !institution || isNaN(age) || age < 10 || age > 100) {
    redirect("/onboarding");
  }

  const sb = supabaseAdmin();

  const { error } = await sb
    .from("users")
    .update({
      full_name: fullName,
      age,
      institution,
      onboarding_completed: true,
    })
    .eq("clerk_user_id", userId);

  if (error) {
    console.error("[onboarding] update error:", error);
    redirect("/onboarding");
  }

  redirect("/app");
}
