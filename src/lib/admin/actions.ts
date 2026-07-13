"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendMetaPurchase } from "@/lib/meta-capi";
import { recordFunnelEventForUser } from "@/lib/api/funnel";
import { getAdminEmail } from "./auth";

async function assertAdmin() {
  const email = await getAdminEmail();
  if (!email) throw new Error("forbidden");
  return email;
}

/** Suma (o resta, si amount es negativo) créditos a un usuario. */
export async function adminGrantCredits(userId: string, amount: number) {
  await assertAdmin();
  const sb = supabaseAdmin();
  const { data: u } = await sb.from("users").select("credits").eq("id", userId).maybeSingle();
  if (!u) throw new Error("user_not_found");
  const next = Math.max(0, (u.credits ?? 0) + Math.trunc(amount));
  await sb.from("users").update({ credits: next }).eq("id", userId);
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
}

export type AdminPlan = "free" | "pro" | "semanal" | "trimestral";

/** Cambia el plan de un usuario — útil para cortesías o soporte. */
export async function adminSetPlan(userId: string, plan: AdminPlan) {
  await assertAdmin();
  const sb = supabaseAdmin();
  const patch: Record<string, unknown> = { plan, updated_at: new Date().toISOString() };

  if (plan === "free") {
    patch.expires_at = null;
  } else if (plan === "semanal") {
    patch.credits = 0;
    patch.expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
  } else if (plan === "trimestral") {
    patch.credits = 500;
    patch.expires_at = new Date(Date.now() + 90 * 86400000).toISOString();
  } else {
    // pro (mensual): créditos plenos, sin vencimiento
    patch.credits = 500;
    patch.expires_at = null;
  }

  await sb.from("users").update(patch).eq("id", userId);
  await recordFunnelEventForUser(
    userId,
    plan === "free" ? "plan_bajo_a_free_admin" : "plan_activado_admin",
    plan,
  );
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
}

/** Reinicia las generaciones gratis del trial (para que alguien vuelva a probar). */
export async function adminResetFreeGenerations(userId: string) {
  await assertAdmin();
  const sb = supabaseAdmin();
  await sb.from("users").update({ free_generations_used: 0 }).eq("id", userId);
  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
}

// ─────────────────────────────────────────────────────────────────────────
// Activar por mail de MercadoPago — para ventas que el webhook no reconoció
// (mail distinto al de la cuenta, sesión anónima perdida, etc). Reemplaza el
// procedimiento manual que veníamos haciendo por SQL directo.
// ─────────────────────────────────────────────────────────────────────────

type MpPreapproval = {
  id: string;
  status: string;
  preapproval_plan_id?: string;
  date_created: string;
};

function mpToken(): string {
  const t = process.env.MP_ACCESS_TOKEN ?? process.env.MP_ACCESS_TOKEN_TEST;
  if (!t) throw new Error("MP_ACCESS_TOKEN no configurado");
  return t;
}

function planFromPreapprovalPlanId(preapprovalPlanId: string | undefined): {
  key: "semanal" | "trimestral" | "pro";
  label: string;
  amount: number;
} {
  if (preapprovalPlanId && preapprovalPlanId === process.env.MP_PLAN_ID_SEMANAL)
    return { key: "semanal", label: "Semanal", amount: 4900 };
  if (preapprovalPlanId && preapprovalPlanId === process.env.MP_PLAN_ID_TRIMESTRAL)
    return { key: "trimestral", label: "Trimestral", amount: 34900 };
  return { key: "pro", label: "Mensual", amount: 15900 };
}

export type MpLookupResult =
  | { found: false }
  | {
      found: true;
      preapprovalId: string;
      status: string;
      planLabel: string;
      amount: number;
      dateCreated: string;
      payerEmail: string;
    };

/** Busca en MercadoPago (solo lectura) la suscripción de ese mail, para mostrar
 * una vista previa antes de aplicar nada. */
export async function adminLookupMpSubscription(email: string): Promise<MpLookupResult> {
  await assertAdmin();
  const norm = email.trim().toLowerCase();
  const res = await fetch(
    `https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(norm)}`,
    { headers: { Authorization: `Bearer ${mpToken()}` } },
  );
  if (!res.ok) throw new Error("mp_search_failed");
  const body = await res.json();
  const results: MpPreapproval[] = body.results ?? [];
  if (results.length === 0) return { found: false };

  // Preferimos la autorizada más reciente; si no hay ninguna, la más reciente igual.
  const authorized = results.filter((r) => r.status === "authorized");
  const best = (authorized.length > 0 ? authorized : results).sort(
    (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime(),
  )[0];

  const { label, amount } = planFromPreapprovalPlanId(best.preapproval_plan_id);
  return {
    found: true,
    preapprovalId: best.id,
    status: best.status,
    planLabel: label,
    amount,
    dateCreated: best.date_created,
    payerEmail: norm,
  };
}

export type MpActivateResult = {
  ok: boolean;
  email: string;
  plan: string;
  accountCreated: boolean;
  paymentRecorded: boolean;
  metaSent: boolean;
  error?: string;
};

/** Activa la cuenta (creándola si no existe), registra el pago y avisa a Meta,
 * a partir de una suscripción real de MercadoPago ya confirmada por el admin. */
export async function adminActivateFromMp(
  email: string,
  preapprovalId: string,
): Promise<MpActivateResult> {
  await assertAdmin();
  const norm = email.trim().toLowerCase();
  const sb = supabaseAdmin();

  const subRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${mpToken()}` },
  });
  if (!subRes.ok) {
    return {
      ok: false, email: norm, plan: "", accountCreated: false,
      paymentRecorded: false, metaSent: false,
      error: "No se pudo confirmar la suscripción en MercadoPago.",
    };
  }
  const sub = await subRes.json();
  const { key: planKey, amount } = planFromPreapprovalPlanId(sub.preapproval_plan_id);
  const expiresAt =
    planKey === "semanal" ? new Date(Date.now() + 7 * 86400000).toISOString()
    : planKey === "trimestral" ? new Date(Date.now() + 90 * 86400000).toISOString()
    : null;
  const credits = planKey === "semanal" ? 0 : 500;

  const { data: existing } = await sb
    .from("users")
    .select("id")
    .eq("normalized_email", norm)
    .maybeSingle();

  let userId: string;
  let accountCreated = false;

  if (existing) {
    userId = existing.id;
    await sb
      .from("users")
      .update({
        plan: planKey, credits, expires_at: expiresAt,
        mp_subscription_id: preapprovalId, updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } else {
    // Libera el mail de cualquier fila anónima que lo tenga guardado como
    // "rescate" (RescuePrompt), para no chocar con el UNIQUE al crear la cuenta.
    await sb
      .from("users")
      .update({ email: null, normalized_email: null })
      .eq("normalized_email", norm)
      .is("clerk_user_id", null);

    const client = await clerkClient();
    const found = await client.users.getUserList({ emailAddress: [norm] });
    const clerkUserId =
      found.data.length > 0
        ? found.data[0].id
        : (await client.users.createUser({ emailAddress: [norm], skipPasswordRequirement: true })).id;

    const { data: inserted, error } = await sb
      .from("users")
      .insert({
        clerk_user_id: clerkUserId, email: norm, normalized_email: norm,
        plan: planKey, credits, expires_at: expiresAt, mp_subscription_id: preapprovalId,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return {
        ok: false, email: norm, plan: planKey, accountCreated: false,
        paymentRecorded: false, metaSent: false, error: "No se pudo crear la cuenta.",
      };
    }
    userId = inserted.id;
    accountCreated = true;
  }

  const { error: payErr } = await sb.from("payments").upsert(
    {
      user_id: userId,
      mp_id: `admin_activate_${preapprovalId}`,
      kind: "authorized_payment",
      amount,
      currency: "ARS",
      status: "approved",
      email: norm,
    },
    { onConflict: "mp_id" },
  );

  let metaSent = false;
  try {
    await sendMetaPurchase({
      email: norm, value: amount, currency: "ARS",
      eventId: `purchase_admin_${preapprovalId}`,
    });
    metaSent = true;
  } catch {
    /* no rompe el flujo si Meta falla */
  }

  await recordFunnelEventForUser(userId, "plan_activado_admin", planKey);

  revalidatePath(`/admin/usuarios/${userId}`);
  revalidatePath("/admin/usuarios");
  revalidatePath("/admin/pagos");
  revalidatePath("/admin");

  return { ok: true, email: norm, plan: planKey, accountCreated, paymentRecorded: !payErr, metaSent };
}
