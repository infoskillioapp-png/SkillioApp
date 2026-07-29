import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEmail } from "@/lib/anti-fraude";
import { PLANS, PRO_CREDITS, type PlanKind } from "@/lib/pricing";
import type { MpSubscription } from "@/lib/mercadopago";

const SEMANAL_DAYS = 7;
const TRIMESTRAL_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;

type PlanActivation = { plan: PlanKind; expiresAt: string | null; credits: number };

// Checkout Pro (sub con preapproval_plan_id): deduce el plan por el plan de MP.
function planFromSubscription(sub: MpSubscription): PlanActivation {
  const pid = sub.preapproval_plan_id;
  if (pid && pid === process.env.MP_PLAN_ID_SEMANAL)
    return { plan: "semanal", expiresAt: new Date(Date.now() + SEMANAL_DAYS * DAY).toISOString(), credits: 0 };
  if (pid && pid === process.env.MP_PLAN_ID_TRIMESTRAL)
    return { plan: "trimestral", expiresAt: new Date(Date.now() + TRIMESTRAL_DAYS * DAY).toISOString(), credits: PRO_CREDITS };
  return { plan: "pro", expiresAt: null, credits: PRO_CREDITS };
}

// Checkout embebido (sub con monto directo, sin plan_id): el plan viene dado.
function planFromKind(kind: PlanKind): PlanActivation {
  const spec = PLANS[kind];
  return {
    plan: kind,
    credits: spec.credits,
    expiresAt: spec.expiresDays == null ? null : new Date(Date.now() + spec.expiresDays * DAY).toISOString(),
  };
}

export type ClaimResult = { clerkUserId: string; plan: string };

/**
 * Crea la cuenta (o reutiliza una existente) para una sesión anónima que acaba
 * de pagar, y devuelve el clerk userId para generar el sign-in token de
 * auto-login. Idempotente.
 *
 * Reglas:
 *  1. Si el mail ya pertenece a una cuenta registrada (otra fila con
 *     clerk_user_id) → activa el plan sobre ESA cuenta y la devuelve. No
 *     duplicamos usuarios (decisión de producto); el contenido de esta sesión
 *     anónima queda sin vincular.
 *  2. Si la fila anónima ya fue reclamada → solo re-activa el plan.
 *  3. Si no → crea (o encuentra) el usuario de Clerk passwordless, reclama la
 *     fila anónima (clerk_user_id + email) y activa el plan sobre ella.
 */
export async function ensureAccountForPaidAnon(opts: {
  anonRowId: string;
  email: string;
  subscription: MpSubscription;
  // Checkout embebido: el plan viene dado (la sub no tiene preapproval_plan_id).
  // Si se omite, se deduce de la sub (Checkout Pro).
  planKind?: PlanKind;
}): Promise<ClaimResult> {
  const sb = supabaseAdmin();
  const email = opts.email.trim().toLowerCase();
  const norm = normalizeEmail(email);
  const { plan, expiresAt, credits } = opts.planKind
    ? planFromKind(opts.planKind)
    : planFromSubscription(opts.subscription);

  const patch: Record<string, unknown> = {
    plan,
    credits,
    expires_at: expiresAt,
    mp_subscription_id: opts.subscription.id,
    updated_at: new Date().toISOString(),
  };

  // 1) ¿El mail ya tiene cuenta registrada?
  const { data: existing } = await sb
    .from("users")
    .select("id, clerk_user_id")
    .eq("normalized_email", norm)
    .not("clerk_user_id", "is", null)
    .neq("id", opts.anonRowId)
    .maybeSingle();
  if (existing?.clerk_user_id) {
    await sb.from("users").update(patch).eq("id", existing.id);
    return { clerkUserId: existing.clerk_user_id as string, plan };
  }

  // 2) ¿La fila anónima ya fue reclamada?
  const { data: anonRow } = await sb
    .from("users")
    .select("clerk_user_id")
    .eq("id", opts.anonRowId)
    .maybeSingle();
  if (anonRow?.clerk_user_id) {
    await sb.from("users").update(patch).eq("id", opts.anonRowId);
    return { clerkUserId: anonRow.clerk_user_id as string, plan };
  }

  // 3) Crear (o encontrar) el usuario de Clerk y reclamar la fila anónima.
  const client = await clerkClient();
  let clerkUserId: string;
  const found = await client.users.getUserList({ emailAddress: [email] });
  if (found.data.length > 0) {
    clerkUserId = found.data[0].id;
  } else {
    const created = await client.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
    });
    clerkUserId = created.id;
  }

  // Liberamos el mail de cualquier otra sesión anónima que lo haya dejado como
  // rescate, para no violar el UNIQUE al reclamarlo acá.
  await sb
    .from("users")
    .update({ email: null, normalized_email: null })
    .eq("normalized_email", norm)
    .is("clerk_user_id", null)
    .neq("id", opts.anonRowId);

  await sb
    .from("users")
    .update({ ...patch, clerk_user_id: clerkUserId, email, normalized_email: norm })
    .eq("id", opts.anonRowId);

  return { clerkUserId, plan };
}
