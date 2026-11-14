import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { claimAccountForAnon } from "@/lib/claim";
import { recordFunnelEventForUser } from "@/lib/api/funnel";
import { sendProWelcomeEmail } from "@/lib/email/resend";
import { sendMetaPurchase } from "@/lib/meta-capi";
import { PASE_DAYS, PRO_CREDITS, isValidDiscountCode, productName } from "@/lib/pricing";
import type { MpPayment } from "@/lib/mercadopago";

const DAY = 24 * 60 * 60 * 1000;

export type PaseActivation = {
  status: "activated" | "already" | "pending" | "rejected" | "not_skillio" | "no_user";
  clerkUserId?: string | null;
  userId?: string | null;
  expiresAt?: string | null;
  voucherUrl?: string | null;
};

/** ¿Es un pago del Pase de Skillio? (la cuenta de MP la comparte otro negocio:
 * sin esta marca NO se activa nada). */
export function isSkillioPasePayment(p: MpPayment): boolean {
  return p.metadata?.skillio_plan === "pase";
}

function meta(p: MpPayment, k: string): string | null {
  const v = p.metadata?.[k];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Activa el Pase por un pago APROBADO de MP. La llaman el checkout (al toque),
 * la vuelta de MP (/pago-pase) y el webhook — la que llegue primero gana.
 *
 * Idempotente de verdad: primero se INSERTA el pago en `payments` (mp_id
 * único). Si ya existía, otro camino ya lo activó → no se suman días de nuevo,
 * no se reenvía el mail ni el Purchase a Meta.
 *
 * Días: 120 desde hoy; si ya tenía un Pase vigente, se suman al final.
 */
export async function activatePasePayment(payment: MpPayment): Promise<PaseActivation> {
  if (!isSkillioPasePayment(payment)) return { status: "not_skillio" };

  if (payment.status !== "approved") {
    const dead = ["rejected", "cancelled", "refunded", "charged_back"].includes(payment.status);
    return {
      status: dead ? "rejected" : "pending",
      voucherUrl: payment.transaction_details?.external_resource_url ?? null,
    };
  }

  const sb = supabaseAdmin();
  const email = (meta(payment, "email") ?? payment.payer?.email ?? "").toLowerCase();

  // 1) ¿A qué fila de users le corresponde?
  let userId: string | null = null;
  let clerkUserId: string | null = null;
  const clerkId = meta(payment, "clerk_user_id");
  const anonRowId = meta(payment, "anon_row_id");
  if (clerkId) {
    const { data } = await sb.from("users").select("id").eq("clerk_user_id", clerkId).maybeSingle();
    if (data) { userId = data.id as string; clerkUserId = clerkId; }
  } else if (anonRowId && email) {
    const r = await claimAccountForAnon({ anonRowId, email });
    userId = r.userId;
    clerkUserId = r.clerkUserId;
  }
  if (!userId) {
    console.error(`[pase] pago ${payment.id} aprobado SIN usuario (email=${email})`);
    return { status: "no_user" };
  }

  // 2) Candado de idempotencia: registrar el pago. Si ya estaba → ya activado.
  const promo = isValidDiscountCode(meta(payment, "promo")) ? meta(payment, "promo")!.toUpperCase() : null;
  const amount = payment.transaction_amount ?? 0;
  const { data: inserted, error: payErr } = await sb
    .from("payments")
    .upsert(
      {
        user_id: userId,
        mp_id: `pay_${payment.id}`,
        kind: "payment",
        plan: "pase",
        promo,
        installments: payment.installments ?? 1,
        payment_method: payment.payment_method_id ?? null,
        amount,
        currency: "ARS",
        status: "approved",
        email,
      },
      { onConflict: "mp_id", ignoreDuplicates: true },
    )
    .select("id");
  if (payErr) {
    console.error("[pase] no se pudo registrar el pago:", payErr);
    return { status: "pending", clerkUserId, userId };
  }
  if (!inserted || inserted.length === 0) {
    const { data: u } = await sb.from("users").select("expires_at").eq("id", userId).maybeSingle();
    return { status: "already", clerkUserId, userId, expiresAt: (u?.expires_at as string) ?? null };
  }

  // 3) Activar / extender.
  const { data: user } = await sb
    .from("users")
    .select("plan, expires_at, phone, full_name")
    .eq("id", userId)
    .maybeSingle();
  const now = Date.now();
  const currentEnd = user?.plan === "pase" && user.expires_at ? new Date(user.expires_at).getTime() : 0;
  const base = Math.max(now, currentEnd);
  const expiresAt = new Date(base + PASE_DAYS * DAY).toISOString();
  const phone = meta(payment, "phone");

  const { error: upErr } = await sb
    .from("users")
    .update({
      plan: "pase",
      credits: PRO_CREDITS,
      expires_at: expiresAt,
      ...(phone && !user?.phone ? { phone } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (upErr) console.error(`[pase] no se pudo activar el plan (user=${userId}):`, upErr);

  console.log(`[pase] ${email} → pase hasta ${expiresAt} (pago ${payment.id}, $${amount}, ${payment.installments ?? 1} cuotas${promo ? `, ${promo}` : ""})`);
  await recordFunnelEventForUser(userId, "pago_confirmado", promo ? "pase_skillio25" : "pase");
  if (email) await sendProWelcomeEmail(email, "pase", (user?.full_name as string) ?? null, { expiresAt });

  // 4) Meta: la compra, UNA vez, con el mismo event_id que el píxel del navegador.
  await sendMetaPurchase({
    email,
    phone: phone ?? (user?.phone as string) ?? null,
    value: amount,
    currency: "ARS",
    eventId: `purchase_${payment.id}`,
    contentName: productName("pase", !!promo),
    contentId: "pase",
    orderId: String(payment.id),
    externalId: userId,
    fbp: meta(payment, "fbp"),
    fbc: meta(payment, "fbc"),
    clientIp: meta(payment, "client_ip"),
    userAgent: meta(payment, "user_agent"),
  });

  return { status: "activated", clerkUserId, userId, expiresAt };
}
