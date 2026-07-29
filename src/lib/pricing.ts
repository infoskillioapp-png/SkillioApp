// Fuente única de precios y del código de descuento del plan Mensual PRO.
// Lo usan el checkout embebido (create-embedded), el webhook (para subir el
// monto tras el primer mes) y los mails de descuento (gift).

export const PRO_PRICE_ARS = 15900; // precio mensual normal
export const DISCOUNT_CODE = "SKILLIO25";
export const DISCOUNT_PCT = 25;

// Precio del PRIMER mes con el código. El descuento aplica SOLO al primer
// cobro; a partir del 2º mes se cobra PRO_PRICE_ARS (el webhook sube el monto
// de la suscripción tras el primer pago).
export const PRO_PRICE_DISCOUNTED = Math.round(PRO_PRICE_ARS * (1 - DISCOUNT_PCT / 100)); // 11925

/** Normaliza y valida un código de descuento ingresado por el usuario. */
export function isValidDiscountCode(raw: string | null | undefined): boolean {
  return typeof raw === "string" && raw.trim().toUpperCase() === DISCOUNT_CODE;
}
