import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { AppProviders } from "@/components/app-providers";
import { Sidebar } from "./_components/sidebar";
import { BookiFab } from "./_components/booki-fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  if (user.onboarding_completed === false) redirect("/onboarding");

  const firstName = user.full_name?.split(" ")[0] ?? "Estudiante";
  const initial = firstName[0]?.toUpperCase() ?? "E";

  return (
    <AppProviders>
      <Sidebar initial={initial} />
      <div className="content-rail">
        {children}
      </div>
      <BookiFab firstName={firstName} />
    </AppProviders>
  );
}
