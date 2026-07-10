import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { AppProviders } from "@/components/app-providers";
import { Sidebar } from "./_components/sidebar";
import { BookiFab } from "./_components/booki-fab";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // Invitado (registro diferido): el middleware sólo lo deja llegar a la home y a
  // la vista de resultado. Le mostramos un shell recortado (sin onboarding, sin
  // asistente Booki) para que suba un apunte y vea el resultado sin cuenta.
  if (!userId) {
    return (
      <AppProviders>
        <Sidebar isGuest />
        <div className="content-rail">{children}</div>
      </AppProviders>
    );
  }

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
