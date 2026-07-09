import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateAnonUser } from "@/lib/anon";

export type Actor = {
  id: string;
  plan: string;
  expires_at: string | null;
  credits: number;
  free_generations_used: number;
  isAnon: boolean;
};

const COLS = "id, plan, expires_at, credits, free_generations_used";

/**
 * Resuelve QUIÉN está haciendo la request para los endpoints del embudo público
 * (subir apunte, generar resumen):
 *
 *   - Usuario de Clerk: flujo con cuenta, ya sincronizado por el layout de /app.
 *   - Sesión anónima: cookie `skillio_anon` (registro diferido). Se crea al vuelo.
 *
 * Es el punto ÚNICO de resolución de identidad de esos endpoints. Como la rama
 * anónima puede setear la cookie, solo se llama desde route handlers / server
 * actions.
 *
 * Lanza `user_row_not_found` en el caso raro de un usuario de Clerk logueado sin
 * fila en Supabase (el layout debería haberla creado antes de llegar acá).
 */
export async function resolveActor(): Promise<Actor> {
  const { userId } = await auth();

  if (userId) {
    const { data } = await supabaseAdmin()
      .from("users")
      .select(COLS)
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!data) throw new Error("user_row_not_found");
    return { ...(data as Omit<Actor, "isAnon">), isAnon: false };
  }

  const anon = await getOrCreateAnonUser();
  return { ...anon, isAnon: true };
}
