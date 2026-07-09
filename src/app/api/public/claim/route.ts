import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clerkClient } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetSubscription } from "@/lib/mercadopago";
import { ensureAccountForPaidAnon } from "@/lib/claim";
import { isDisposableEmail } from "@/lib/anti-fraude";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reclamo del embudo anónimo tras el pago: confirma el mail propio, crea la
// cuenta (o reutiliza la existente) y devuelve un sign-in token para el
// auto-login del cliente. La activación del plan la hace en paralelo el webhook;
// acá igual la re-aseguramos (idempotente) por si el webhook aún no llegó.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const preapprovalId = String(body.preapproval_id ?? "");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!preapprovalId) return NextResponse.json({ error: "missing_preapproval" }, { status: 400 });
    if (!EMAIL_RE.test(email) || isDisposableEmail(email))
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });

    const subscription = await mpGetSubscription(preapprovalId);
    if (subscription.status !== "authorized" && subscription.status !== "pending")
      return NextResponse.json({ error: "subscription_not_active", status: subscription.status }, { status: 409 });

    // Ubicar la fila anónima: por la cookie o por el external_reference de la sub.
    const sb = supabaseAdmin();
    const session = (await cookies()).get("skillio_anon")?.value ?? "";
    let anonRowId: string | null = null;
    if (session) {
      const { data } = await sb.from("users").select("id").eq("anon_session_id", session).maybeSingle();
      anonRowId = data?.id ?? null;
    }
    if (!anonRowId && subscription.external_reference) {
      const { data } = await sb
        .from("users")
        .select("id")
        .eq("anon_session_id", subscription.external_reference)
        .maybeSingle();
      anonRowId = data?.id ?? null;
    }
    if (!anonRowId) return NextResponse.json({ error: "anon_session_not_found" }, { status: 404 });

    const { clerkUserId, plan } = await ensureAccountForPaidAnon({ anonRowId, email, subscription });

    // Sign-in token para el auto-login (strategy 'ticket' en el cliente).
    const client = await clerkClient();
    const token = await client.signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 60 * 10,
    });

    return NextResponse.json({ ok: true, token: token.token, plan });
  } catch (e) {
    console.error("[api/public/claim]", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
