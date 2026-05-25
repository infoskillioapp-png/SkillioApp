import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el browser.
 * Usa la anon key (publica). Sirve para lecturas publicas
 * (ej: feed de la Comunidad de apuntes).
 *
 * Para operaciones autenticadas del usuario corriente,
 * usar siempre route handlers de Next con `supabaseAdmin()`
 * y verificando la session de Clerk con `auth()`.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
