"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function updateProfile(data: { career?: string; institution?: string }) {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");

  const payload: Record<string, string | null> = {};
  if (data.career !== undefined) payload.career = data.career.trim() || null;
  if (data.institution !== undefined) payload.institution = data.institution.trim() || null;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabaseAdmin()
    .from("users")
    .update(payload)
    .eq("clerk_user_id", userId);

  if (error) {
    console.error("[profile.update]", error);
    throw new Error("No se pudo guardar el perfil. Intentá de nuevo.");
  }

  revalidatePath("/app");
}
