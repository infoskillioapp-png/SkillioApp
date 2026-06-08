import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { syncUserToSupabase } from "@/lib/sync-user";
import { applyReferral } from "@/lib/api/referrals";
import { PagarClient } from "./_components/pagar-client";

interface Props {
  searchParams: Promise<{ plan?: string; ref?: string }>;
}

export default async function PagarPage({ searchParams }: Props) {
  const { userId } = await auth();
  const sp = await searchParams;

  if (!userId) {
    const refParam = sp.ref ? `?ref=${sp.ref}` : "";
    redirect(`/registro${refParam}`);
  }

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  if (user.plan !== "free") redirect("/app");

  const hasReferral = await applyReferral(user, sp.ref);

  return <PagarClient hasReferral={hasReferral} />;
}
