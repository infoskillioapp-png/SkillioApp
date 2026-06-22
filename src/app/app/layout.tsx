import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUserToSupabase } from "@/lib/sync-user";
import { AppProviders } from "@/components/app-providers";
import { Sidebar } from "./_components/sidebar";
import { Topbar } from "./_components/topbar";
import { Booki } from "./_components/booki";
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

      return { id: e.id, when, date: dateStr, time, title: e.title, place: e.room ?? "", tone };
    });
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const user = await syncUserToSupabase();
  if (!user) redirect("/login");

  if (user.onboarding_completed === false) redirect("/onboarding");
  if (user.demo_completed === false) redirect("/demo");

  const upcomingEvents = await listEvents({
    fromIso: new Date().toISOString(),
    toIso: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).catch(() => [] as AgendaEvent[]);

  const reminders = buildReminders(upcomingEvents);
  const firstName = user.full_name?.split(" ")[0] ?? "estudiante";

  return (
    <AppProviders offerStartedAt={user.offer_started_at}>
      <div className="v3-shell">
        <Sidebar user={user} />
        <div className="v3-content">
          <Topbar user={user} />
          <main>{children}</main>
        </div>
      </div>
      <Booki firstName={firstName} reminders={reminders} />
    </AppProviders>
  );
}
