"use server";

import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { recordFunnelEvent } from "@/lib/api/funnel";
import { sendMetaEvent } from "@/lib/meta-capi";

/**
 * Marca el demo guiado como completado (no se vuelve a mostrar), dispara el mail
 * de handoff a la compu y registra el evento de funnel + DemoCompletado (CAPI).
 * Idempotente: si ya estaba completado, no reenvía mail.
 *
 * Devuelve el event_id para que el cliente dispare el píxel DemoCompletado con
 * el mismo id (deduplicación pixel + CAPI).
 */
export async function completeDemo(): Promise<{ ok: boolean; eventId: string }> {
  const eventId = randomUUID();
  const { userId } = await auth();
  if (!userId) return { ok: false, eventId };

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id, email, full_name, phone, demo_completed")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!user) return { ok: false, eventId };

  // Ya completado antes: no repetimos mail ni evento.
  if (user.demo_completed) return { ok: true, eventId };

  await sb.from("users").update({ demo_completed: true }).eq("id", user.id);

  await recordFunnelEvent("demo_completed", "demo_3", { event_id: eventId });

  // DemoCompletado por CAPI (server) — el cliente dispara el píxel con el mismo id.
  await sendMetaEvent({
    eventName: "DemoCompletado",
    email: user.email,
    phone: user.phone,
    eventId,
  });

  return { ok: true, eventId };
}
