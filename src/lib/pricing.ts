// Fuente única de planes, precios y del código de descuento.
// Lo usan el checkout embebido (create-embedded), el webhook y los mails.

export type PlanKind = "pro" | "semanal" | "trimestral";

export const PRO_PRICE_ARS = 15900;
export const SEMANAL_PRICE_ARS = 4900;
export const TRIMESTRAL_PRICE_ARS = 34900;

export const DISCOUNT_CODE = "SKILLIO25";
export const DISCOUNT_PCT = 25;

// Precio del PRIMER mes con el código (solo plan pro). A partir del 2º mes se
// cobra PRO_PRICE_ARS — el webhook sube el monto de la sub tras el 1er pago.
export const PRO_PRICE_DISCOUNTED = Math.round(PRO_PRICE_ARS * (1 - DISCOUNT_PCT / 100)); // 11925

export const PRO_CREDITS = 500;

export type PlanSpec = {
  label: string;
  amount: number;
  frequency: number;
  frequencyType: "months" | "days";
  credits: number;
  expiresDays: number | null; // null = sin vencimiento (mensual recurrente)
};

// Datos de cada plan para el checkout embebido (preapproval con monto directo).
export const PLANS: Record<PlanKind, PlanSpec> = {
  pro:        { label: "Mensual PRO", amount: PRO_PRICE_ARS,        frequency: 1, frequencyType: "months", credits: PRO_CREDITS, expiresDays: null },
  semanal:    { label: "Semanal",     amount: SEMANAL_PRICE_ARS,    frequency: 7, frequencyType: "days",   credits: 0,           expiresDays: 7 },
  trimestral: { label: "Trimestral",  amount: TRIMESTRAL_PRICE_ARS, frequency: 3, frequencyType: "months", credits: PRO_CREDITS, expiresDays: 90 },
};

export function isPlanKind(x: unknown): x is PlanKind {
  return x === "pro" || x === "semanal" || x === "trimestral";
}

/** Normaliza y valida un código de descuento ingresado por el usuario. */
export function isValidDiscountCode(raw: string | null | undefined): boolean {
  return typeof raw === "string" && raw.trim().toUpperCase() === DISCOUNT_CODE;
}

/**
 * Deduce el plan por el MONTO cobrado. Necesario en el webhook para las
 * suscripciones EMBEBIDAS (monto directo, sin preapproval_plan_id). Contempla
 * el monto descontado del primer mes (→ pro). Devuelve null si no matchea.
 */
export function planKindFromAmount(amount: number | null | undefined): PlanKind | null {
  if (amount == null) return null;
  if (amount === SEMANAL_PRICE_ARS) return "semanal";
  if (amount === TRIMESTRAL_PRICE_ARS) return "trimestral";
  if (amount === PRO_PRICE_ARS || amount === PRO_PRICE_DISCOUNTED) return "pro";
  return null;
}
