import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Dominios de mail temporal/descartable conocidos. Lista corta y ampliable.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "temp-mail.org",
  "tempmail.com",
  "tempmail.dev",
  "tempr.email",
  "throwawaymail.com",
  "getnada.com",
  "trashmail.com",
  "yopmail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "emailondeck.com",
  "mohmal.com",
  "mailnesia.com",
  "spam4.me",
  "mintemail.com",
  "discard.email",
]);

/**
 * Normaliza un email para detectar duplicados reales.
 * Gmail/Googlemail ignoran los puntos y todo lo que va después de '+',
 * así que juan.perez+1@gmail.com y juanperez@gmail.com son la MISMA casilla.
 * Para otros dominios solo cortamos el '+alias' (no tocamos los puntos).
 */
export function normalizeEmail(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at === -1) return e;

  let local = e.slice(0, at).split("+")[0];
  const domain = e.slice(at + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    local = local.replace(/\./g, "");
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

export type EmailVerdict = "ok" | "disposable" | "duplicate";

/**
 * Decide si un email puede registrarse:
 *  - "disposable": dominio de mail temporal → bloqueado.
 *  - "duplicate": ya existe OTRA cuenta con el mismo email normalizado.
 *  - "ok": habilitado.
 * Se llama ANTES de crear la fila del usuario (en el onboarding).
 */
export async function checkEmailAllowed(
  clerkUserId: string,
  email: string,
): Promise<EmailVerdict> {
  if (isDisposableEmail(email)) return "disposable";

  const normalized = normalizeEmail(email);
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("clerk_user_id")
    .eq("normalized_email", normalized)
    .neq("clerk_user_id", clerkUserId) // no contar la propia fila
    .maybeSingle();

  return data ? "duplicate" : "ok";
}
