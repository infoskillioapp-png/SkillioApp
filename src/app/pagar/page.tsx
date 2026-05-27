import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { syncUserToSupabase } from "@/lib/sync-user";
import { PagarClient } from "./_components/pagar-client";

interface Props {
  searchParams: Promise<{ plan?: string }>;
}

export default async function PagarPage({ searchParams }: Props) {
  const { userId } = await auth();
  if (!userId) {
    const sp = await searchParams;
    const planParam = sp.plan === "basico" ? "basico" : "pro";
    redirect(`/registro?plan=${planParam}`);
  }

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  // Ya tiene un plan activo → al dashboard
  if (user.plan !== "free") redirect("/app");

  const sp = await searchParams;
  const planParam: "pro" | "basico" = sp.plan === "basico" ? "basico" : "pro";

  return <PagarClient plan={planParam} />;
}
