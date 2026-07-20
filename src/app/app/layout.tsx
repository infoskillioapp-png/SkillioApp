import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { isPaidPlan } from "@/lib/ai/claude";
import { AppProviders } from "@/components/app-providers";
import { Sidebar } from "./_components/sidebar";
import { BookiFab } from "./_components/booki-fab";
import { SupportButton } from "./_components/support-button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();

  // Registro diferido: el invitado (sin cuenta) es un usuario FREE completo. Ve
  // toda la app con el mismo shell (sidebar completo + Booki). No hay onboarding
  // ni sync de Clerk; identidad por defecto hasta que cree la cuenta al pagar.
  let firstName = "Estudiante";
  if (userId) {
    const user = await syncUserToSupabase();
    if (!user) redirect("/login");
    if (user.onboarding_completed === false) redirect("/onboarding");
    // Teléfono obligatorio para todo usuario pago. El paso de /pago-exitoso es
    // "best effort" del lado del cliente (se puede saltear con el timeout, o
    // cerrando la pestaña antes de guardarlo) — esto es el gate real que no
    // se puede evitar mientras el plan siga activo.
    if (isPaidPlan(user.plan, user.expires_at) && !user.phone) redirect("/completar-telefono");
    firstName = user.full_name?.split(" ")[0] ?? "Estudiante";
  }
  const initial = firstName[0]?.toUpperCase() ?? "E";

  return (
    <AppProviders>
      <Sidebar initial={initial} />
      <div className="content-rail">
        {children}
      </div>
      <BookiFab firstName={firstName} />
      <SupportButton />
    </AppProviders>
  );
}
