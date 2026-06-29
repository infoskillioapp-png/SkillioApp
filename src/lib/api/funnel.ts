import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Instrumentación del funnel. Una fila por evento en public.funnel_events.
// Nunca lanza: si falla, loguea y sigue (medir no debe romper la experiencia).
//
// Taxonomía de eventos del funnel nuevo (sin demo):
//   registro_completado   · alta terminada            (step: plan preferido | null)
//   apunte_subido         · subió material            (step: pdf | foto | texto)
//   paywall_visto         · se le mostró el paywall    (step: ctx — resumen|simulacro|flashcard|generic)
//   paywall_plan_click    · tocó un plan en el paywall (step: semanal|mensual|trimestral)
//   checkout_iniciado     · redirigido a MercadoPago   (step: semanal|pro|trimestral)
//   pago_confirmado       · suscripción activada        (step: semanal|pro|trimestral)
// La "activación" (1ª generación con material propio) vive en users.activated_at
// y el detalle de generaciones en ai_outputs — el admin los cruza con esto.

async function insertEvent(
  userId: string | null,
  event: string,
  step?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await supabaseAdmin().from("funnel_events").insert({
      user_id: userId,
      event,
      step: step ?? null,
      meta: meta ?? null,
    });
  } catch (e) {
    console.error("[funnel] insert error:", e);
  }
}

/**
 * Registra un evento resolviendo el user_id desde la sesión de Clerk. Para rutas
 * y server actions con sesión del usuario. Sin sesión, guarda con user_id null.
 */
export async function recordFunnelEvent(
  event: string,
  step?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  try {
    const { userId } = await auth();
    let dbUserId: string | null = null;
    if (userId) {
      const { data } = await supabaseAdmin()
        .from("users")
        .select("id")
        .eq("clerk_user_id", userId)
        .maybeSingle();
      dbUserId = data?.id ?? null;
    }
    await insertEvent(dbUserId, event, step, meta);
  } catch (e) {
    console.error("[funnel] recordFunnelEvent error:", e);
  }
}

/**
 * Registra un evento con el id de usuario (de public.users) explícito. Para
 * contextos sin sesión de Clerk, como el webhook de MercadoPago.
 */
export async function recordFunnelEventForUser(
  dbUserId: string | null,
  event: string,
  step?: string | null,
  meta?: Record<string, unknown> | null,
): Promise<void> {
  await insertEvent(dbUserId, event, step, meta);
}
