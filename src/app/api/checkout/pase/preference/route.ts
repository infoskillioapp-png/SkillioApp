import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { mpCreatePreference, type SkillioPaymentMeta } from "@/lib/mercadopago";
import { resolveBuyer, metaBrowserContext, getAppOrigin, WEBHOOK_URL } from "@/lib/checkout";
import { isDisposableEmail } from "@/lib/anti-fraude";
import { DISCOUNT_CODE, isValidDiscountCode, priceFor } from "@/lib/pricing";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Preferencia para pagar el Pase con la PLATA de la cuenta de Mercado Pago (o
// cuotas sin tarjeta). La pide el checkout al llegar al paso del pago; el
// Payment Brick la usa para la opción "Mercado Pago".
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = (typeof body.phone === "string" ? body.phone : "").replace(/[^\d+]/g, "").slice(0, 20);
    const withPromo = isValidDiscountCode(body.promo);
    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });

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
    const origin = getAppOrigin();
    const pref = await mpCreatePreference({
      amount: priceFor("pase", withPromo),
      payerEmail: email,
      externalReference: `pase:${buyer.clerkUserId ?? buyer.anonSession}`,
      metadata,
      notificationUrl: WEBHOOK_URL(),
      successUrl: `${origin}/pago-pase`,
      failureUrl: `${origin}/pagar?plan=pase${withPromo ? `&promo=${DISCOUNT_CODE}` : ""}`,
    });
    return NextResponse.json({ ok: true, preference_id: pref.id });
  } catch (e) {
    console.error("[api/checkout/pase/preference]", e);
    Sentry.captureException(e, { tags: { step: "checkout-pase:preference" } });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
