import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetPlan } from "@/lib/mercadopago";
import { getOrCreateAnonUser } from "@/lib/anon";
import { recordFunnelEvent, recordFunnelEventForUser } from "@/lib/api/funnel";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // "semanal" | "trimestral" | cualquier otro valor → mensual (pro)
  const planType: "semanal" | "trimestral" | "pro" =
    body.plan === "semanal" ? "semanal" : body.plan === "trimestral" ? "trimestral" : "pro";

  const planId =
    planType === "semanal"
      ? process.env.MP_PLAN_ID_SEMANAL
      : planType === "trimestral"
        ? process.env.MP_PLAN_ID_TRIMESTRAL
        : process.env.MP_PLAN_ID_PRO;

  if (!planId) {
    console.error(`[subscription/create] env var para plan=${planType} no configurada`);
    return NextResponse.json({ error: "Planes no configurados. Contactá soporte." }, { status: 500 });
  }

  const { userId } = await auth();
  const sb = supabaseAdmin();

  // external_reference: clerk userId (con cuenta) o anon_session_id (registro
  // diferido). El webhook lo usa para encontrar la fila y activar el plan.
  let externalRef: string;
  let currentPlan: string;
  let anonRowId: string | null = null;

  if (userId) {
    const { data: user } = await sb
      .from("users")
      .select("id, plan")
      .eq("clerk_user_id", userId)
      .maybeSingle();
    if (!user) return NextResponse.json({ error: "user not found" }, { status: 404 });
    externalRef = userId;
    currentPlan = user.plan;
  } else {
    const anon = await getOrCreateAnonUser();
    const session = (await cookies()).get("skillio_anon")?.value ?? "";
    if (!session) return NextResponse.json({ error: "no_session" }, { status: 400 });
    externalRef = session;
    currentPlan = anon.plan;
    anonRowId = anon.id;
  }

  if (currentPlan !== "free")
    return NextResponse.json({ error: "already_subscribed" }, { status: 400 });

  const plan = await mpGetPlan(planId);

  // Inyectamos external_reference en el init_point del plan.
  const url = new URL(plan.init_point);
  url.searchParams.set("external_reference", externalRef);

  // Funnel: llegó hasta el checkout de MercadoPago.
  if (userId) await recordFunnelEvent("checkout_iniciado", planType);
  else if (anonRowId) await recordFunnelEventForUser(anonRowId, "checkout_iniciado", planType);

  return NextResponse.json({ init_point: url.toString(), plan: planType });
}
