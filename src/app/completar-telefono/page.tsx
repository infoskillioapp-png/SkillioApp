import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { PhoneGateClient } from "./_components/phone-gate-client";

export default async function CompletarTelefonoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await syncUserToSupabase();
  if (!user) redirect("/login");
  if (user.phone) redirect("/app");

  const { next } = await searchParams;
  const dest = next && next.startsWith("/") ? next : "/app";

  return <PhoneGateClient next={dest} />;
}
