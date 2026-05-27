import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mpCreateSubscription } from "@/lib/mercadopago";

export async function POST() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const planId = process.env.MP_PLAN_ID_PRO;
  if (!planId) {
    console.error("[subscription/create] MP_PLAN_ID_PRO not set");
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
  if (user.plan === "pro")
    return NextResponse.json({ error: "already_pro" }, { status: 400 });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://skillio-app.vercel.app";

  const subscription = await mpCreateSubscription({
    planId,
    reason: "Plan PRO Skillio",
    externalRef: userId,
    payerEmail: user.email,
    backUrl: `${appUrl}/app?upgraded=1`,
  });

  return NextResponse.json({ init_point: subscription.init_point });
}
