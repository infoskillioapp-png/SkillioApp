import "server-only";
import { currentUser } from "@clerk/nextjs/server";

// Acceso al panel /admin: allowlist de emails (no hay sistema de login aparte;
// el admin entra con su cuenta normal de Clerk y se chequea su email acá).
// Configurable con ADMIN_EMAILS (separados por coma) en Vercel/.env.local.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "huertaemi00@gmail.com,info.skillioapp@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

/** Devuelve el email del admin logueado, o null si no está autorizado. */
export async function getAdminEmail(): Promise<string | null> {
  const cu = await currentUser();
  const email = cu?.primaryEmailAddress?.emailAddress ?? null;
  return isAdminEmail(email) ? email : null;
}
