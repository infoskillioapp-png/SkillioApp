import "server-only";
import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOrCreateAnonUser } from "@/lib/anon";
import { isPaidPlan } from "@/lib/ai/claude";

const ANON_COOKIE = "skillio_anon";

// MP valida las URLs de forma estricta y RECHAZA *.vercel.app → siempre el
// dominio real (salvo que NEXT_PUBLIC_APP_URL sea https y no vercel.app).
const PROD_ORIGIN = "https://skillio.digital";
export function getAppOrigin(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && /^https:\/\/.+/.test(env) && !env.includes(".vercel.app")) {
    return env.replace(/\/+$/, "");
  }
  return PROD_ORIGIN;
}

// ?source_news=webhooks → MP manda solo el formato webhook (no el IPN viejo).
export const WEBHOOK_URL = () => `${getAppOrigin()}/api/webhooks/mercadopago?source_news=webhooks`;

export type Buyer = {
  clerkUserId: string | null;
  rowId: string;
  anonSession: string | null;
  plan: string;
  expiresAt: string | null;
  /** Ya tiene un plan pago vigente que NO es el Pase (ej. Mensual activo). */
  hasOtherPaidPlan: boolean;
};

/** Quién está comprando: cuenta (Clerk) o sesión anónima (registro diferido). */
export async function resolveBuyer(): Promise<Buyer | null> {
  const { userId } = await auth();
  const sb = supabaseAdmin();
  if (userId) {
    const { data } = await sb.from("users").select("id, plan, expires_at").eq("clerk_user_id", userId).maybeSingle();
    if (!data) return null;
    const paid = isPaidPlan(data.plan, data.expires_at);
    return {
      clerkUserId: userId, rowId: data.id, anonSession: null,
      plan: data.plan, expiresAt: data.expires_at,
      hasOtherPaidPlan: paid && data.plan !== "pase",
    };
  }
  const anon = await getOrCreateAnonUser();
  const session = (await cookies()).get(ANON_COOKIE)?.value ?? "";
  if (!session) return null;
  // Un anónimo es siempre free (invariante de actor.ts).
  return { clerkUserId: null, rowId: anon.id, anonSession: session, plan: "free", expiresAt: null, hasOtherPaidPlan: false };
}

/** Datos del navegador para que Meta reconozca a la persona (Purchase por CAPI). */
export async function metaBrowserContext(): Promise<{ fbp: string | null; fbc: string | null; clientIp: string | null; userAgent: string | null }> {
  const jar = await cookies();
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return {
    fbp: jar.get("_fbp")?.value ?? null,
    fbc: jar.get("_fbc")?.value ?? null,
    clientIp: ip,
    userAgent: h.get("user-agent"),
  };
}
