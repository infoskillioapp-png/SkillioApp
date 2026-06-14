import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Instrumentación del funnel de onboarding/demo. Una fila por evento en
// public.funnel_events. Nunca lanza: si falla, loguea y sigue (medir no debe
// romper la experiencia). Resolvé el user_id desde Clerk; si no hay sesión,
// igual guardamos la fila con user_id null (eventos pre-login del landing).
export async function recordFunnelEvent(
  event: string,
  step?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const { userId } = await auth();
    const sb = supabaseAdmin();

    let dbUserId: string | null = null;
    if (userId) {
      const { data } = await sb
        .from("users")
        .select("id")
        .eq("clerk_user_id", userId)
        .maybeSingle();
      dbUserId = data?.id ?? null;
    }

    await sb.from("funnel_events").insert({
      user_id: dbUserId,
      event,
      step: step ?? null,
      meta: meta ?? null,
    });
  } catch (e) {
    console.error("[funnel] recordFunnelEvent error:", e);
  }
}
