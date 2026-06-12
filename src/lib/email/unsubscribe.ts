import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Firma del token de baja. Usamos un secreto del servidor (estable en todos los
// entornos) para que nadie pueda dar de baja un mail ajeno adivinando el link.
function secret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    "skillio-unsub-fallback"
  );
}

/** Token determinístico por email (sin expiración: la baja no caduca). */
export function makeUnsubToken(email: string): string {
  return createHmac("sha256", secret()).update(email).digest("hex").slice(0, 32);
}

export function verifyUnsubToken(email: string, token: string): boolean {
  const expected = makeUnsubToken(email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

/** URL de baja one-click para incrustar en el header y el footer del mail. */
export function buildUnsubscribeUrl(appUrl: string, email: string): string {
  const e = encodeURIComponent(email);
  const t = makeUnsubToken(email);
  return `${appUrl}/api/unsubscribe?e=${e}&t=${t}`;
}
