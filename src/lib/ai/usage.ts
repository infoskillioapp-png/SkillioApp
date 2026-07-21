import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Usage = { inputTokens?: number; outputTokens?: number } | undefined;

// ---------------------------------------------------------------------------
// Tope de uso (anti-abuso) para planes pagos — diario + semanal, estilo
// Claude.ai. Protege contra sesiones fuera de serie (ej. $2.88 en 30 min de
// un mismo usuario) sin tocar lo que el usuario ya generó (nunca se bloquea
// contenido existente, solo generar cosas NUEVAS). No garantiza margen al
// precio actual de los planes — es un techo anti-catástrofe, no un cálculo
// de rentabilidad. Ver memoria "skillio-unit-economics" para el contexto.
export const DAILY_CAP_USD = 1.5;
export const WEEKLY_CAP_USD = 5;

const PRICES: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1.0, out: 5.0 },
  "claude-haiku-4-5": { in: 1.0, out: 5.0 },
  "claude-sonnet-4-6": { in: 3.0, out: 15.0 },
};
const DEFAULT_PRICE = { in: 3.0, out: 15.0 };

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

async function costSinceUsd(userId: string, since: Date): Promise<number> {
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("ai_usage")
    .select("model, input_tokens, output_tokens")
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  let usd = 0;
  for (const row of data ?? []) {
    const price = PRICES[row.model ?? ""] ?? DEFAULT_PRICE;
    usd += ((row.input_tokens ?? 0) / 1e6) * price.in + ((row.output_tokens ?? 0) / 1e6) * price.out;
  }
  return usd;
}

export type UsageLimitCheck =
  | { allowed: true }
  | { allowed: false; reason: "daily" | "weekly"; resetAt: string };

/**
 * Chequea el tope de uso diario/semanal ANTES de dejar generar algo nuevo.
 * Solo aplica a planes pagos (llamar únicamente cuando isPaid === true — free
 * ya tiene su propio gate de 1 generación de por vida). Como se calcula sobre
 * ai_usage (histórico real), es retroactivo: si un usuario ya gastó de más
 * hoy/esta semana, el próximo intento de generar lo corta de inmediato.
 */
export type UsageSnapshot = {
  daily: { usedUsd: number; capUsd: number; pct: number; resetAt: string };
  weekly: { usedUsd: number; capUsd: number; pct: number; resetAt: string };
};

/** Para mostrar en /app/perfil (barras estilo Claude.ai) — mismo cálculo que checkUsageLimit. */
export async function getUsageSnapshot(userId: string): Promise<UsageSnapshot> {
  const dayStart = startOfTodayArt();
  const weekStart = startOfWeekArt();
  const [dayCost, weekCost] = await Promise.all([
    costSinceUsd(userId, dayStart),
    costSinceUsd(userId, weekStart),
  ]);
  return {
    daily: {
      usedUsd: dayCost,
      capUsd: DAILY_CAP_USD,
      pct: Math.min(100, Math.round((dayCost / DAILY_CAP_USD) * 100)),
      resetAt: new Date(dayStart.getTime() + 86_400_000).toISOString(),
    },
    weekly: {
      usedUsd: weekCost,
      capUsd: WEEKLY_CAP_USD,
      pct: Math.min(100, Math.round((weekCost / WEEKLY_CAP_USD) * 100)),
      resetAt: new Date(weekStart.getTime() + 7 * 86_400_000).toISOString(),
    },
  };
}

export async function checkUsageLimit(userId: string): Promise<UsageLimitCheck> {
  const weekStart = startOfWeekArt();
  const weekCost = await costSinceUsd(userId, weekStart);
  if (weekCost >= WEEKLY_CAP_USD) {
    const resetAt = new Date(weekStart.getTime() + 7 * 86_400_000);
    return { allowed: false, reason: "weekly", resetAt: resetAt.toISOString() };
  }

  const dayStart = startOfTodayArt();
  const dayCost = await costSinceUsd(userId, dayStart);
  if (dayCost >= DAILY_CAP_USD) {
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
