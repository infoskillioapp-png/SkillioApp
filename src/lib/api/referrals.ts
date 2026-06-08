import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Captura el referido de un usuario recién registrado.
 *
 * Si llegó con `?ref=<token>` y todavía no tiene `referred_by`, lo asocia al
 * referrer dueño de ese token y crea la fila `referrals` en estado `pending`.
 *
 * Idempotente y a prueba de carreras: el update solo pisa si `referred_by` es
 * null, y el upsert ignora duplicados por `referred_id`.
 *
 * Devuelve `true` si el usuario quedó con un referido asociado (para mostrar el
 * badge de "regalo").
 */
export async function applyReferral(
  user: { id: string; referred_by: string | null },
  refToken: string | null | undefined,
): Promise<boolean> {
  if (user.referred_by) return true;
  if (!refToken) return false;

  const sb = supabaseAdmin();

  const { data: referrer } = await sb
    .from("users")
    .select("id")
    .eq("referral_token", refToken)
    .neq("id", user.id) // no puede referirse a sí mismo
    .maybeSingle();

  if (!referrer) return false;

  // ignoreSets para evitar race: si otra request ya lo asignó, no pisamos
  await sb
    .from("users")
    .update({ referred_by: referrer.id })
    .eq("id", user.id)
    .is("referred_by", null);

  // onConflict: si ya existe la fila de referral, la dejamos como está
  await sb.from("referrals").upsert(
    { referrer_id: referrer.id, referred_id: user.id, status: "pending" },
    { onConflict: "referred_id", ignoreDuplicates: true },
  );

  return true;
}
