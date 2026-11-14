// Fuente ÚNICA de planes, precios y del código de descuento.
// La usan el paywall, el checkout, el webhook, los mails y la landing.
//
// Relanzamiento nov-2026: se venden SOLO 2 planes —
//   · Mensual (pro): suscripción con débito automático, $29.990/mes.
//   · Pase de cuatrimestre (pase): PAGO ÚNICO, 120 días, hasta 3 cuotas sin
//     interés, sin renovación automática.
// Semanal y Trimestral ya no se venden, pero el webhook los sigue reconociendo
// (montos LEGACY) por si llega algún aviso viejo de MP.

export type PlanKind = "pro" | "semanal" | "trimestral" | "pase";
/** Planes que se pueden comprar hoy. */
export type SellablePlan = "pro" | "pase";

export const PRO_PRICE_ARS = 29990;
export const PASE_PRICE_ARS = 79900;
export const PASE_DAYS = 120;
export const PASE_MAX_INSTALLMENTS = 3;

export const DISCOUNT_CODE = "SKILLIO25";
export const DISCOUNT_PCT = 25;

// Con el código, el usuario ELIGE dónde aplicarlo:
//  · Mensual: solo el PRIMER mes ($22.490); el webhook sube el monto a
//    PRO_PRICE_ARS tras ese primer cobro.
//  · Pase: $59.900 (25% redondeado) — pago único.
export const PRO_PRICE_DISCOUNTED = 22490;
export const PASE_PRICE_DISCOUNTED = 59900;

export const PRO_CREDITS = 500;

// Montos de planes viejos (ya no se venden). Solo para reconocer avisos de MP.
export const LEGACY_AMOUNTS = {
  pro: [15900, 11925, 16000],
  semanal: [4900],
  trimestral: [34900],
} as const;
export const SEMANAL_PRICE_ARS = 4900;
export const TRIMESTRAL_PRICE_ARS = 34900;

export type PlanSpec = {
  label: string;
  amount: number;
  frequency: number;
  frequencyType: "months" | "days";
  credits: number;
  expiresDays: number | null; // null = sin vencimiento (mensual recurrente)
};

export const PLANS: Record<PlanKind, PlanSpec> = {
  pro:        { label: "Mensual PRO",          amount: PRO_PRICE_ARS,        frequency: 1, frequencyType: "months", credits: PRO_CREDITS, expiresDays: null },
  pase:       { label: "Pase de cuatrimestre", amount: PASE_PRICE_ARS,       frequency: 0, frequencyType: "days",   credits: PRO_CREDITS, expiresDays: PASE_DAYS },
  semanal:    { label: "Semanal",              amount: SEMANAL_PRICE_ARS,    frequency: 7, frequencyType: "days",   credits: 0,           expiresDays: 7 },
  trimestral: { label: "Trimestral",           amount: TRIMESTRAL_PRICE_ARS, frequency: 3, frequencyType: "months", credits: PRO_CREDITS, expiresDays: 90 },
};

/** Lo que cuesta el Pase si se pagara en mensual (ancla del paywall). */
export const PASE_ANCHOR_ARS = PRO_PRICE_ARS * 4; // 119.960
export const PASE_SAVING_ARS = PASE_ANCHOR_ARS - PASE_PRICE_ARS; // 40.060

export const fmtARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
/** Valor de cada cuota (sin interés). */
export const cuota = (total: number, n = PASE_MAX_INSTALLMENTS) => Math.round(total / n);

export function isPlanKind(x: unknown): x is PlanKind {
  return x === "pro" || x === "semanal" || x === "trimestral" || x === "pase";
}

/** Normaliza lo que venga por URL (?plan=…) a un plan que se vende hoy.
 * Los links viejos de semanal/trimestral van al Pase. */
export function toSellablePlan(x: unknown): SellablePlan {
  if (x === "pro" || x === "mensual") return "pro";
  return "pase";
}

/** Normaliza y valida un código de descuento ingresado por el usuario. */
export function isValidDiscountCode(raw: string | null | undefined): boolean {
  return typeof raw === "string" && raw.trim().toUpperCase() === DISCOUNT_CODE;
}

/** Monto a cobrar para un plan, con o sin código. */
export function priceFor(plan: SellablePlan, withDiscount: boolean): number {
  if (plan === "pase") return withDiscount ? PASE_PRICE_DISCOUNTED : PASE_PRICE_ARS;
  return withDiscount ? PRO_PRICE_DISCOUNTED : PRO_PRICE_ARS;
}

/** Nombre del producto para Meta (content_name) y el admin. */
export function productName(plan: PlanKind, withDiscount: boolean): string {
  if (plan === "pase") return withDiscount ? "Pase cuatrimestre SKILLIO25" : "Pase cuatrimestre";
  if (plan === "pro") return withDiscount ? "Mensual SKILLIO25" : "Mensual";
  return PLANS[plan].label;
}

/**
 * Deduce el plan por el MONTO cobrado (suscripciones embebidas: no tienen
 * preapproval_plan_id). OJO: el Pase NO se detecta por monto (se identifica por
 * la metadata del pago); igual se mapea por si acaso. El valor de una cuota
 * ($26.633) nunca llega como monto: en cuotas sin interés el pago es por el total.
 */
export function planKindFromAmount(amount: number | null | undefined): PlanKind | null {
  if (amount == null) return null;
  if (amount === PRO_PRICE_ARS || amount === PRO_PRICE_DISCOUNTED) return "pro";
  if (amount === PASE_PRICE_ARS || amount === PASE_PRICE_DISCOUNTED) return "pase";
  if ((LEGACY_AMOUNTS.pro as readonly number[]).includes(amount)) return "pro";
  if ((LEGACY_AMOUNTS.semanal as readonly number[]).includes(amount)) return "semanal";
  if ((LEGACY_AMOUNTS.trimestral as readonly number[]).includes(amount)) return "trimestral";
  return null;
}

/** ¿El monto corresponde al primer mes con descuento del Mensual? */
export function isDiscountedMonthly(amount: number | null | undefined): boolean {
  return amount === PRO_PRICE_DISCOUNTED || amount === 11925;
}
