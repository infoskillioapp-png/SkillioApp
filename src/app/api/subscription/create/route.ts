import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpGetPlan } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

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
    return NextResponse.json(
      { error: "Planes no configurados. Contactá soporte." },
      { status: 500 },
    );
  }

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id, email, plan")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (!user)
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (user.plan !== "free")
    return NextResponse.json({ error: "already_subscribed" }, { status: 400 });

  const plan = await mpGetPlan(planId);

  // Inyectamos external_reference (clerk userId) en el init_point
  const url = new URL(plan.init_point);
  url.searchParams.set("external_reference", userId);

  return NextResponse.json({ init_point: url.toString(), plan: planType });
}
