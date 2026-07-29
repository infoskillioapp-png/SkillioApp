import "server-only";

const MP_BASE = "https://api.mercadopago.com";

export function mpToken(): string {
  const t = process.env.MP_ACCESS_TOKEN ?? process.env.MP_ACCESS_TOKEN_TEST;
  if (!t) throw new Error("MP_ACCESS_TOKEN not configured");
  return t;
}

async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${MP_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${mpToken()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MP ${init?.method ?? "GET"} ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface MpPlan {
  id: string;
  status: string;
  reason: string;
  init_point: string;
}

export interface MpSubscription {
  id: string;
  status: "authorized" | "cancelled" | "paused" | "pending";
  external_reference: string;
  payer_email: string;
  preapproval_plan_id: string;
  init_point: string;
  auto_recurring?: { transaction_amount?: number; currency_id?: string } | null;
  summarized?: { last_charged_date?: string | null; last_charged_amount?: number | null } | null;
}

// Al cancelar (desde la app o desde MercadoPago), el usuario ya pagó por un
// período que todavía no terminó — debe seguir con acceso hasta esa fecha, no
// perderlo en el momento. Estimamos el fin del período desde el último cobro
// real (MP no siempre devuelve next_payment_date en una suscripción cancelada).
export function periodEndFromLastCharge(
  sub: MpSubscription,
  planType: "pro" | "semanal" | "trimestral",
): string | null {
  const lastCharged = sub.summarized?.last_charged_date;
  if (!lastCharged) return null;
  const days = planType === "semanal" ? 7 : planType === "trimestral" ? 90 : 30;
  return new Date(new Date(lastCharged).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

// MP soporta frequency_type "months" | "days" (no "weeks").
// Para semanal: frequency=7, frequency_type="days".
export function mpCreatePlan(
  reason: string,
  amount: number,
  backUrl: string,
  opts: { frequency?: number; frequencyType?: "months" | "days" } = {},
): Promise<MpPlan> {
  return mpFetch("/preapproval_plan", {
    method: "POST",
    body: JSON.stringify({
      reason,
      auto_recurring: {
        frequency: opts.frequency ?? 1,
        frequency_type: opts.frequencyType ?? "months",
        transaction_amount: amount,
        currency_id: "ARS",
      },
      back_url: backUrl,
      payment_methods_allowed: {
        payment_types: [{ id: "credit_card" }, { id: "debit_card" }],
      },
    }),
  });
}

export function mpCreateSubscription(data: {
  planId: string;
  reason: string;
  externalRef: string;
  payerEmail: string;
  backUrl: string;
}): Promise<MpSubscription> {
  return mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      preapproval_plan_id: data.planId,
      reason: data.reason,
      external_reference: data.externalRef,
      payer_email: data.payerEmail,
      back_url: data.backUrl,
      status: "pending",
    }),
  });
}

// Checkout EMBEBIDO: crea la suscripción con la tarjeta ya tokenizada en el
// navegador (Bricks). status:"authorized" + card_token_id → MP cobra el primer
// pago YA y devuelve la preapproval autorizada, sin redirigir a MP. El monto va
// directo en auto_recurring (sin preapproval_plan_id) para tener control total
// del importe — clave para el descuento de primer mes (Fase 2), donde después
// se sube el monto con mpUpdateSubscriptionAmount y MP lo respeta por ser una
// preapproval de monto propio (no heredado de un plan).
export function mpCreateSubscriptionWithToken(data: {
  reason: string;
  externalRef: string;
  payerEmail: string;
  cardTokenId: string;
  amount: number;
  backUrl: string;
  frequency?: number;
  frequencyType?: "months" | "days";
}): Promise<MpSubscription> {
  return mpFetch("/preapproval", {
    method: "POST",
    body: JSON.stringify({
      reason: data.reason,
      external_reference: data.externalRef,
      payer_email: data.payerEmail,
      card_token_id: data.cardTokenId,
      auto_recurring: {
        frequency: data.frequency ?? 1,
        frequency_type: data.frequencyType ?? "months",
        transaction_amount: data.amount,
        currency_id: "ARS",
      },
      back_url: data.backUrl,
      status: "authorized",
    }),
  });
}

// Sube (o cambia) el importe de una suscripción ya autorizada. Se usa en la
// primera renovación del descuento de primer mes: la sub nace a $11.925 y acá
// se lleva a $15.900 para los cobros siguientes.
export function mpUpdateSubscriptionAmount(id: string, amount: number): Promise<MpSubscription> {
  return mpFetch<MpSubscription>(`/preapproval/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: amount,
        currency_id: "ARS",
      },
    }),
  });
}

export function mpGetPlan(id: string): Promise<MpPlan> {
  return mpFetch<MpPlan>(`/preapproval_plan/${id}`);
}

export function mpGetSubscription(id: string): Promise<MpSubscription> {
  return mpFetch<MpSubscription>(`/preapproval/${id}`);
}

export function mpCancelSubscription(id: string): Promise<MpSubscription> {
  return mpFetch<MpSubscription>(`/preapproval/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

export interface MpPayment {
  id: number;
  status: string;
  preapproval_id: string | null;
  external_reference: string | null;
  payer: { email: string };
  transaction_amount: number | null;
}

export function mpGetPayment(id: string): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${id}`);
}

// Pago recurrente de una suscripción. MP lo notifica con
// type: "subscription_authorized_payment" y data.id = id de este recurso.
export interface MpAuthorizedPayment {
  id: number;
  preapproval_id: string | null;
  status: string; // "processed" | "scheduled" | "recycling" | ...
  payment: { id: number; status: string } | null;
  transaction_amount: number | null;
}

export function mpGetAuthorizedPayment(id: string): Promise<MpAuthorizedPayment> {
  return mpFetch<MpAuthorizedPayment>(`/authorized_payments/${id}`);
}
