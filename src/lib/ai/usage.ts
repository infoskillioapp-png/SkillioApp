import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Usage = { inputTokens?: number; outputTokens?: number } | undefined;

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
