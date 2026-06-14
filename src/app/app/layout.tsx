import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { AppProviders } from "@/components/app-providers";
import { ReferralNudge } from "@/components/referral-nudge";
import { headers } from "next/headers";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";
import { Booki } from "./_components/booki";
import { MobileNav } from "./_components/mobile-nav";
import { listEvents } from "@/lib/api/events";
import type { AgendaEvent } from "@/lib/types";

type Reminder = {
  id: string;
  when: string;
  date: string;
  time: string;
  title: string;
  place: string;
  tone: "danger" | "info" | "warning";
};

function buildReminders(events: AgendaEvent[]): Reminder[] {
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const relevant = ["exam", "midterm", "tp"] as const;

  return events
    .filter((e) => {
      const d = new Date(e.starts_at);
      return relevant.includes(e.kind as never) && d >= now && d <= sevenDaysOut;
    })
    .slice(0, 3)
    .map((e) => {
      const d = new Date(e.starts_at);
      const diffMs = d.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;

      const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      const dateStr = isToday
        ? "HOY"
        : isTomorrow
          ? "MAÑANA"
          : `${DAY_NAMES[d.getDay()]} ${d.getDate()}`;

      const when = isToday ? "HOY" : isTomorrow ? "MAÑANA" : `EN ${diffDays} DÍAS`;

      const tone: "danger" | "warning" | "info" =
        isToday ? "danger" : isTomorrow ? "warning" : "info";

      const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

      return {
        id: e.id,
        when,
        date: dateStr,
        time,
        title: e.title,
        place: e.room ?? "",
        tone,
      };
    });
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  // Sin muro de pago: el free entra al dashboard. El único límite son las 3
  // generaciones de IA gratis (se controla en las rutas /api/ai/*).
  if (user.onboarding_completed === false) redirect("/onboarding");

  // Onboarding hecho pero demo guiado sin completar → lo forzamos. El demo es
  // la experiencia que convierte (activación de 8% a 40%+); no se saltea.
  if (user.demo_completed === false) redirect("/demo");

  // Eventos próximos (exámenes, parciales, TPs) para Booki
  const upcomingEvents = await listEvents({
    fromIso: new Date().toISOString(),
    toIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).catch(() => [] as AgendaEvent[]);

  const reminders = buildReminders(upcomingEvents);
  const firstName = user.full_name?.split(" ")[0] ?? "estudiante";

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  // Si no tiene token (nunca debería pasar tras la migración), no mostramos link roto
  const referralUrl = user.referral_token
    ? `${proto}://${host}/registro?ref=${user.referral_token}`
    : `${proto}://${host}/registro`;

  return (
    <AppProviders offerStartedAt={user.offer_started_at}>
      <div className="fixed inset-0 grid grid-rows-[52px_1fr] bg-bg text-ink transition-colors overflow-x-hidden">
        <Topbar user={user} />
        <div className="grid md:grid-cols-[244px_1fr] overflow-hidden min-h-0 min-w-0">
          <div className="hidden md:block h-full overflow-hidden">
            <Sidebar user={user} />
          </div>
          {/* min-w-0: evita el "grid blowout" (un hijo ancho estiraría el main
              más que la pantalla y cortaría el contenido a la derecha en mobile).
              pb inferior = alto de la bottom-nav + safe-area del dispositivo. */}
          <main className="min-w-0 overflow-x-hidden overflow-y-auto pb-[calc(78px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
        </div>
      </div>
      {/* Booki fuera del main para que position:fixed funcione correctamente */}
      <Booki firstName={firstName} reminders={reminders} />
      <MobileNav />
      <ReferralNudge referralUrl={referralUrl} />
    </AppProviders>
  );
}
