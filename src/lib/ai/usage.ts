import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Usage = { inputTokens?: number; outputTokens?: number } | undefined;

// ---------------------------------------------------------------------------
// Tope de uso (anti-abuso) para planes pagos — por CANTIDAD DE APUNTES, diario
// + semanal. La unidad es el apunte: subir un apunte y generar su resumen
// cuenta 1. Las tarjetas y el simulacro on-demand de ESE mismo apunte NO
// descuentan (no son 'summarize'). Nunca bloquea contenido ya generado, solo
// generar un apunte NUEVO cuando se pasó del tope. Ver "skillio-unit-economics".
export const DAILY_GEN_LIMIT = 5; // apuntes nuevos por día (plan pago)
export const WEEKLY_GEN_LIMIT = 15; // apuntes nuevos por semana

const TZ_OFFSET_HOURS = 3; // ART = UTC-3, sin horario de verano

function startOfTodayArt(): Date {
  const now = new Date();
  const artShifted = new Date(now.getTime() - TZ_OFFSET_HOURS * 3600_000);
  const y = artShifted.getUTCFullYear();
  const m = artShifted.getUTCMonth();
  const d = artShifted.getUTCDate();
  return new Date(Date.UTC(y, m, d, TZ_OFFSET_HOURS, 0, 0));
}

function startOfWeekArt(): Date {
  const now = new Date();
  const artShifted = new Date(now.getTime() - TZ_OFFSET_HOURS * 3600_000);
  const dow = artShifted.getUTCDay(); // 0=domingo … 6=sábado
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  const y = artShifted.getUTCFullYear();
  const m = artShifted.getUTCMonth();
  const d = artShifted.getUTCDate() - diffToMonday;
  return new Date(Date.UTC(y, m, d, TZ_OFFSET_HOURS, 0, 0));
}

// Cuenta apuntes generados = filas kind='summarize' desde `since` (el resumen se
// arma 1 vez por apunte al subirlo; las tarjetas/simulacro on-demand son otro
// kind y no cuentan). Usa count exacto (head) para no traer filas.
async function countSummariesSince(userId: string, since: Date): Promise<number> {
  const sb = supabaseAdmin();
  const { count } = await sb
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", "summarize")
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

export type UsageLimitCheck =
  | { allowed: true }
  | { allowed: false; reason: "daily" | "weekly"; resetAt: string };

export type UsageBar = { used: number; limit: number; pct: number; resetAt: string };
export type UsageSnapshot = { daily: UsageBar; weekly: UsageBar };

/** Para mostrar en /app/perfil y en el home — mismo conteo que checkUsageLimit. */
export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const dayStart = startOfTodayArt();
  const weekStart = startOfWeekArt();
  const [dayCount, weekCount] = await Promise.all([
    countSummariesSince(userId, dayStart),
    countSummariesSince(userId, weekStart),
  ]);
  return {
    daily: {
      used: dayCount,
      limit: DAILY_GEN_LIMIT,
      pct: Math.min(100, Math.round((dayCount / DAILY_GEN_LIMIT) * 100)),
      resetAt: new Date(dayStart.getTime() + 86_400_000).toISOString(),
    },
    weekly: {
      used: weekCount,
      limit: WEEKLY_GEN_LIMIT,
      pct: Math.min(100, Math.round((weekCount / WEEKLY_GEN_LIMIT) * 100)),
      resetAt: new Date(weekStart.getTime() + 7 * 86_400_000).toISOString(),
    },
  };
}

/**
 * Chequea el tope de apuntes diario/semanal ANTES de generar un apunte NUEVO.
 * Solo para planes pagos (free tiene su gate de 1 generación de por vida).
 * Llamar SOLO cuando se va a generar un resumen nuevo — las generaciones
 * on-demand (tarjetas/simulacro de un apunte ya existente) no se topean.
 */
export async function checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
  const weekStart = startOfWeekArt();
  const weekCount = await countSummariesSince(userId, weekStart);
  if (weekCount >= WEEKLY_GEN_LIMIT) {
    const resetAt = new Date(weekStart.getTime() + 7 * 86_400_000);
    return { allowed: false, reason: "weekly", resetAt: resetAt.toISOString() };
  }

  const dayStart = startOfTodayArt();
  const dayCount = await countSummariesSince(userId, dayStart);
  if (dayCount >= DAILY_GEN_LIMIT) {
    const resetAt = new Date(dayStart.getTime() + 86_400_000);
    return { allowed: false, reason: "daily", resetAt: resetAt.toISOString() };
  }

  return { allowed: true };
}

/**
 * Registra el consumo de tokens de CUALQUIER llamada a la IA en public.ai_usage,
 * para que el costo del admin sea real (incluye chat, tips y práctica, no solo
 * las generaciones). Nunca lanza: medir no debe romper la generación.
 *
 * Pasá `userDbId` (UUID de public.users) si ya lo tenés; si solo tenés el Clerk
 * userId, pasá `clerkUserId` y lo resuelve.
 */
export async function recordAiUsage(opts: {
  kind: string;
  model: string;
  usage: Usage;
  userDbId?: string | null;
  clerkUserId?: string | null;
}): Promise<void> {
  try {
    const sb = supabaseAdmin();
    let userId = opts.userDbId ?? null;
    if (!userId && opts.clerkUserId) {
      const { data } = await sb
        .from("users")
        .select("id")
        .eq("clerk_user_id", opts.clerkUserId)
        .maybeSingle();
      userId = data?.id ?? null;
    }
    await sb.from("ai_usage").insert({
      user_id: userId,
      kind: opts.kind,
      model: opts.model,
      input_tokens: opts.usage?.inputTokens ?? null,
      output_tokens: opts.usage?.outputTokens ?? null,
    });
  } catch (e) {
    console.error("[ai_usage] record error:", e);
  }
}
