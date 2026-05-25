import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase con permisos de service_role.
 *
 * SOLO BACKEND (route handlers, server actions, server components).
 * Bypassa RLS, asi que SIEMPRE verificar la sesion de Clerk antes de
 * llamar metodos sobre datos de usuario:
 *
 *   const { userId } = await auth();
 *   if (!userId) return new Response("Unauthorized", { status: 401 });
 *   const sb = supabaseAdmin();
 *   const { data } = await sb.from("subjects").select().eq("clerk_user_id", userId);
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
