import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDisposableEmail, normalizeEmail } from "@/lib/anti-fraude";

export type SkillioUser = {
  id: string;
  clerk_user_id: string;
  email: string;
  normalized_email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro";
  mp_subscription_id: string | null;
  credits: number;
  free_generations_used: number;
  referral_token: string | null;
  referred_by: string | null;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  level: number;
  created_at: string;
  age: number | null;
  institution: string | null;
  career: string | null;
  phone: string | null;
  onboarding_completed: boolean;
};

/**
 * Sincroniza el usuario de Clerk con la tabla `public.users` de Supabase.
 *
 * Idempotente: si ya existe la fila la deja como esta (no pisa nombre ni avatar
 * cargados manualmente). Solo crea la fila la primera vez.
 *
 * Devuelve la fila completa de Supabase, o null si no hay sesion.
 */
export async function syncUserToSupabase(): Promise<SkillioUser | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const sb = supabaseAdmin();

  // Fast path: si ya existe, devuelvo la fila sin tocar Clerk de nuevo.
  const { data: existing, error: selErr } = await sb
    .from("users")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (selErr) {
    console.error("[sync-user] select error:", selErr);
    return null;
  }
  if (existing) return existing as SkillioUser;

  // Primera vez (o race con otra request concurrente): traigo perfil de Clerk
  // y hago UPSERT atomico sobre clerk_user_id.
  // Si dos requests del mismo usuario corren en paralelo (layout + page),
  // ambas hacen upsert y Postgres serializa: una inserta, la otra updatea
  // sin pisar nada relevante (email/avatar pueden cambiar en Clerk).
  const cu = await currentUser();
  if (!cu) return null;

  const email = cu.primaryEmailAddress?.emailAddress;
  if (!email) {
    console.error("[sync-user] Clerk user has no primary email");
    return null;
  }

  // Backstop anti-fraude: no creamos fila para mails temporales. El gate de UX
  // (mensaje + cerrar sesión) vive en /onboarding; esto es defensa en profundidad.
  if (isDisposableEmail(email)) {
    console.warn("[sync-user] email descartable rechazado:", email);
    return null;
  }

  const fullName =
    [cu.firstName, cu.lastName].filter(Boolean).join(" ").trim() || null;

  const { data, error } = await sb
    .from("users")
    .upsert(
      {
        clerk_user_id: userId,
        email,
        normalized_email: normalizeEmail(email),
        full_name: fullName,
        avatar_url: cu.imageUrl || null,
        // Genera token solo en INSERT (ignorado en UPDATE por onConflict)
        referral_token: Math.random().toString(36).slice(2, 12),
      },
      { onConflict: "clerk_user_id" },
    )
    .select("*")
    .single();

  if (error) {
    console.error("[sync-user] upsert error:", error);
    return null;
  }
  return data as SkillioUser;
}
