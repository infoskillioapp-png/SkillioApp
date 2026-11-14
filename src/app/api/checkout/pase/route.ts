import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { clerkClient } from "@clerk/nextjs/server";
import { mpCreatePayment, type SkillioPaymentMeta } from "@/lib/mercadopago";
import { activatePasePayment } from "@/lib/pase";
import { resolveBuyer, metaBrowserContext, WEBHOOK_URL } from "@/lib/checkout";
import { isDisposableEmail } from "@/lib/anti-fraude";
import { recordFunnelEventForUser } from "@/lib/api/funnel";
import { DISCOUNT_CODE, PASE_MAX_INSTALLMENTS, isValidDiscountCode, priceFor } from "@/lib/pricing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Motivos de rechazo de MP → mensaje entendible para el usuario.
function friendlyReject(detail: string | null | undefined): string {
  switch (detail) {
    case "cc_rejected_insufficient_amount": return "La tarjeta no tiene saldo o límite suficiente. Probá con otra o pagá en cuotas.";
    case "cc_rejected_bad_filled_security_code": return "El código de seguridad no es correcto.";
    case "cc_rejected_bad_filled_date": return "La fecha de vencimiento no es correcta.";
    case "cc_rejected_bad_filled_other":
    case "cc_rejected_bad_filled_card_number": return "Revisá los datos de la tarjeta.";
    case "cc_rejected_call_for_authorize": return "Tu banco pide que autorices el pago. Llamalo o probá con otra tarjeta.";
    case "cc_rejected_card_disabled": return "La tarjeta está inactiva. Activala con tu banco o usá otra.";
    case "cc_rejected_duplicated_payment": return "Ya hiciste un pago por este monto hace un momento. Revisá tu mail.";
    case "cc_rejected_high_risk": return "Mercado Pago no aprobó el pago. Probá con otra tarjeta o con dinero en cuenta.";
    default: return "No pudimos procesar el pago. Revisá los datos o probá con otro medio de pago.";
  }
}

// Pase de cuatrimestre — PAGO ÚNICO (no suscripción). El Payment Brick tokeniza
// la tarjeta (o arma el pedido de efectivo) en el navegador; acá cobramos con
// /v1/payments. La tarjeta NUNCA toca nuestro server. Respuesta inmediata.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const form = (body.formData ?? {}) as Record<string, unknown>;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = (typeof body.phone === "string" ? body.phone : "").replace(/[^\d+]/g, "").slice(0, 20);
    const withPromo = isValidDiscountCode(body.promo);
    const amount = priceFor("pase", withPromo);

    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    const paymentMethodId = typeof form.payment_method_id === "string" ? form.payment_method_id : "";
    if (!paymentMethodId) return NextResponse.json({ error: "missing_payment_method" }, { status: 400 });

    const buyer = await resolveBuyer();
    if (!buyer) return NextResponse.json({ error: "no_session" }, { status: 400 });
    if (buyer.hasOtherPaidPlan) return NextResponse.json({ error: "already_subscribed" }, { status: 400 });

    const ctx = await metaBrowserContext();
    const metadata: SkillioPaymentMeta = {
      skillio_plan: "pase",
      promo: withPromo ? DISCOUNT_CODE : null,
      email,
      clerk_user_id: buyer.clerkUserId,
      anon_row_id: buyer.clerkUserId ? null : buyer.rowId,
      anon_session: buyer.anonSession,
      phone: phone || null,
      fbp: ctx.fbp, fbc: ctx.fbc, client_ip: ctx.clientIp, user_agent: ctx.userAgent,
    };

    const formPayer = (form.payer ?? {}) as Record<string, unknown>;
    const token = typeof form.token === "string" ? form.token : null;
    const installments = Math.min(PASE_MAX_INSTALLMENTS, Math.max(1, Number(form.installments) || 1));

    let payment;
    try {
      payment = await mpCreatePayment({
        idempotencyKey: randomUUID(),
        amount, // SIEMPRE el monto del server, nunca el que manda el navegador
        paymentMethodId,
        token,
        installments: token ? installments : null,
        issuerId: (form.issuer_id as string | number | undefined) ?? null,
        payer: {
          email,
          ...(typeof formPayer.first_name === "string" ? { first_name: formPayer.first_name } : {}),
          ...(typeof formPayer.last_name === "string" ? { last_name: formPayer.last_name } : {}),
          ...(formPayer.identification ? { identification: formPayer.identification as { type?: string; number?: string } } : {}),
        },
        externalReference: `pase:${buyer.clerkUserId ?? buyer.anonSession}`,
        metadata,
        notificationUrl: WEBHOOK_URL(),
      });
    } catch (e) {
      console.error("[checkout/pase] MP rechazó el pago:", e instanceof Error ? e.message : e);
      Sentry.captureException(e, { tags: { step: "checkout-pase:mp" } });
      return NextResponse.json({ error: "card_declined", message: friendlyReject(null) }, { status: 402 });
    }

    await recordFunnelEventForUser(buyer.rowId, "checkout_iniciado", withPromo ? "pase_skillio25" : "pase");

    if (payment.status === "rejected" || payment.status === "cancelled") {
      return NextResponse.json({ error: "card_declined", message: friendlyReject(payment.status_detail) }, { status: 402 });
    }

    // Si el webhook de MP llega en el mismo instante, la creación de la cuenta
    // puede chocar: reintentamos una vez (la activación es idempotente).
    let result;
    try {
      result = await activatePasePayment(payment);
    } catch (e) {
      console.warn("[checkout/pase] activación falló, reintento:", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, 1500));
      result = await activatePasePayment(payment);
    }

    // Efectivo (Rapipago/Pago Fácil) o tarjeta en revisión: se activa solo
    // cuando MP lo apruebe (lo hace el webhook).
    if (result.status === "pending") {
      return NextResponse.json({ ok: true, status: "pending", voucher_url: result.voucherUrl ?? null, payment_id: payment.id });
    }
    if (result.status !== "activated" && result.status !== "already") {
      return NextResponse.json({ error: "activation_failed" }, { status: 500 });
    }

    // Anónimo → token de auto-login para la cuenta recién creada/reclamada.
    let signInToken: string | null = null;
    if (!buyer.clerkUserId && result.clerkUserId) {
      const client = await clerkClient();
      signInToken = (await client.signInTokens.createSignInToken({ userId: result.clerkUserId, expiresInSeconds: 600 })).token;
    }

    return NextResponse.json({
      ok: true, status: "approved", plan: "pase",
      payment_id: payment.id, value: amount, promo: withPromo, token: signInToken,
    });
  } catch (e) {
    console.error("[api/checkout/pase]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
