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
