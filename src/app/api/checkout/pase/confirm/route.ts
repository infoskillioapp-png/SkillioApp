import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { mpGetPayment } from "@/lib/mercadopago";
import { activatePasePayment, isSkillioPasePayment } from "@/lib/pase";

const ANON_COOKIE = "skillio_anon";

// Vuelta de Mercado Pago (pago con dinero en cuenta). Confirma el pago y activa
// el Pase al toque (el webhook hace lo mismo; el primero que llega gana).
// SEGURIDAD: el token de auto-login se da SOLO si quien vuelve es la misma
// sesión anónima que inició el pago. Si no, se activa igual y el usuario
// ingresa con su mail (código).
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId = String(body.payment_id ?? "").replace(/\D/g, "");
    if (!paymentId) return NextResponse.json({ error: "missing_payment_id" }, { status: 400 });

    const payment = await mpGetPayment(paymentId);
    if (!isSkillioPasePayment(payment)) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const result = await activatePasePayment(payment);
    if (result.status === "pending") return NextResponse.json({ ok: true, status: "pending", voucher_url: result.voucherUrl ?? null });
    if (result.status === "rejected") return NextResponse.json({ ok: false, status: "rejected" });
    if (result.status !== "activated" && result.status !== "already")
      return NextResponse.json({ error: "activation_failed" }, { status: 500 });

    const meta = payment.metadata ?? {};
    const promo = typeof meta.promo === "string" && meta.promo.length > 0;
    const base = { ok: true, status: "approved", payment_id: payment.id, value: payment.transaction_amount, promo };

    const { userId } = await auth();
    if (userId) return NextResponse.json(base);

    const session = (await cookies()).get(ANON_COOKIE)?.value ?? "";
    const sameSession = !!session && session === meta.anon_session;
    let token: string | null = null;
    if (sameSession && result.clerkUserId) {
      const client = await clerkClient();
      token = (await client.signInTokens.createSignInToken({ userId: result.clerkUserId, expiresInSeconds: 600 })).token;
    }
    return NextResponse.json({ ...base, token, needs_login: !token });
  } catch (e) {
    console.error("[api/checkout/pase/confirm]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
