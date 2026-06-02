import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { syncUserToSupabase } from "@/lib/sync-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PagarClient } from "./_components/pagar-client";

interface Props {
  searchParams: Promise<{ plan?: string; ref?: string }>;
}

export default async function PagarPage({ searchParams }: Props) {
  const { userId } = await auth();
  const sp = await searchParams;

  if (!userId) {
    const planParam = sp.plan === "basico" ? "basico" : "pro";
    const refParam = sp.ref ? `&ref=${sp.ref}` : "";
    redirect(`/registro?plan=${planParam}${refParam}`);
  }

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  if (user.plan !== "free") redirect("/app");

  const planParam: "pro" | "basico" = sp.plan === "basico" ? "basico" : "pro";
  let hasReferral = false;

  // Si llegó con ?ref= y todavía no tiene referred_by, lo seteamos ahora
  if (sp.ref && !user.referred_by) {
    const sb = supabaseAdmin();
    const { data: referrer } = await sb
      .from("users")
      .select("id")
      .eq("referral_token", sp.ref)
      .neq("id", user.id) // no puede referirse a sí mismo
      .maybeSingle();

    if (referrer) {
      // ignoreSets para evitar race condition: si otra request ya lo asignó, no pisamos
      await sb
        .from("users")
        .update({ referred_by: referrer.id })
        .eq("id", user.id)
        .is("referred_by", null);

      // onConflict: si ya existe la fila de referral, la dejamos como está
      await sb.from("referrals").upsert(
        { referrer_id: referrer.id, referred_id: user.id, status: "pending" },
        { onConflict: "referred_id", ignoreDuplicates: true },
      );

      hasReferral = true;
    }
  } else if (user.referred_by) {
    hasReferral = true;
  }

  return <PagarClient plan={planParam} hasReferral={hasReferral} />;
}
