"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminEmail } from "./auth";

async function assertAdmin() {
  const email = await getAdminEmail();
  if (!email) throw new Error("forbidden");
  return email;
}

/** Suma (o resta, si amount es negativo) créditos a un usuario. */
export async function adminGrantCredits(userId: string, amount: number) {
  await assertAdmin();
  const sb = supabaseAdmin();
  const { data: u } = await sb.from("users").select("credits").eq("id", userId).maybeSingle();
  if (!u) throw new Error("user_not_found");
  const next = Math.max(0, (u.credits ?? 0) + Math.trunc(amount));
  await sb.from("users").update({ credits: next }).eq("id", userId);
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
}

/** Cambia el plan de un usuario (free/pro) — útil para cortesías o soporte. */
export async function adminSetPlan(userId: string, plan: "free" | "pro") {
  await assertAdmin();
  const sb = supabaseAdmin();
  const patch: Record<string, unknown> = { plan };
  // Si lo pasamos a PRO sin créditos, le damos el tier completo.
  if (plan === "pro") {
    const { data: u } = await sb.from("users").select("credits").eq("id", userId).maybeSingle();
    if (u && (u.credits ?? 0) < 500) patch.credits = 500;
  }
  await sb.from("users").update(patch).eq("id", userId);
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
}

/** Reinicia las generaciones gratis del trial (para que alguien vuelva a probar). */
export async function adminResetFreeGenerations(userId: string) {
  await assertAdmin();
  const sb = supabaseAdmin();
  await sb.from("users").update({ free_generations_used: 0 }).eq("id", userId);
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
}
