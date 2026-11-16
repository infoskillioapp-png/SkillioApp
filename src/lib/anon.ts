import "server-only";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readAcquisition } from "@/lib/acquisition";

const ANON_COOKIE = "skillio_anon";
const ONE_YEAR = 60 * 60 * 24 * 365;

export type AnonUserRow = {
  id: string;
  plan: string;
  expires_at: string | null;
  credits: number;
  free_generations_used: number;
  full_name: string | null;
  created_at: string;
};

const COLS = "id, plan, expires_at, credits, free_generations_used, full_name, created_at";
// Igual que COLS + acquisition (de qué anuncio vino): solo para decidir si hay que guardarla.
const COLS_ACQ = "id, plan, expires_at, credits, free_generations_used, full_name, created_at, acquisition";

/**
 * Devuelve la fila `users` de la sesión anónima actual, creándola si no existe.
 *
 * Identidad = cookie `skillio_anon` (UUID). Como puede SETEAR la cookie, solo se
 * puede llamar desde route handlers o server actions (contextos que pueden
 * escribir cookies), nunca desde el render de un Server Component.
 *
 * Idempotente y a prueba de carreras: el UPSERT con onConflict=anon_session_id
 * serializa dos requests con la misma cookie sin duplicar la fila.
 */
export async function getOrCreateAnonUser(): Promise<AnonUserRow> {
  const jar = await cookies();
  const sb = supabaseAdmin();

  const existingId = jar.get(ANON_COOKIE)?.value;
  // De qué anuncio vino (UTMs de primer toque). null si entró directo / orgánico.
  const acquisition = await readAcquisition();

  if (existingId) {
    const { data } = await sb
      .from("users")
      .select(COLS_ACQ)
      .eq("anon_session_id", existingId)
      .maybeSingle();
    if (data) {
      // Primer toque: se guarda una sola vez y no se pisa (.is null).
      if (acquisition && !data.acquisition) {
        await sb.from("users").update({ acquisition }).eq("id", data.id).is("acquisition", null);
      }
      return data as unknown as AnonUserRow;
    }
    // Cookie presente pero sin fila (fila borrada): recreamos con el mismo id.
  }

  const anonId = existingId ?? randomUUID();

  const { data, error } = await sb
    .from("users")
    .upsert(
      { anon_session_id: anonId, plan: "free", ...(acquisition ? { acquisition } : {}) },
      { onConflict: "anon_session_id" },
    )
    .select(COLS)
    .single();
  if (error) throw new Error(`[anon] upsert failed: ${error.message}`);

  if (!existingId) {
    jar.set(ANON_COOKIE, anonId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  }

  return data as AnonUserRow;
}
