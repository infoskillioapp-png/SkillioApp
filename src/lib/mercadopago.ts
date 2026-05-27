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
}

export interface MpSubscription {
  id: string;
  status: "authorized" | "cancelled" | "paused" | "pending";
  external_reference: string;
  payer_email: string;
  preapproval_plan_id: string;
  init_point: string;
}

export function mpCreatePlan(reason: string, amount: number, backUrl: string): Promise<MpPlan> {
  return mpFetch("/preapproval_plan", {
    method: "POST",
    body: JSON.stringify({
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
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

export function mpGetSubscription(id: string): Promise<MpSubscription> {
  return mpFetch<MpSubscription>(`/preapproval/${id}`);
}

export function mpCancelSubscription(id: string): Promise<MpSubscription> {
  return mpFetch<MpSubscription>(`/preapproval/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}
