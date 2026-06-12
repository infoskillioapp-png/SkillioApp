import { redirect } from "next/navigation";
import { getCurrentSkillioUser, getDashboardStats } from "@/lib/db";
import { listEvents } from "@/lib/api/events";
import { OfferBanner } from "@/components/offer-countdown";
import { Greeting } from "./_components/dashboard/greeting";
import { MetricChips } from "./_components/dashboard/metric-chips";
import { Pomodoro } from "./_components/dashboard/pomodoro";
import { LevelCard } from "./_components/dashboard/level-card";
import { AgendaPreview } from "./_components/dashboard/agenda-preview";
import type { AgendaEvent } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const [stats, todayEvents] = await Promise.all([
    getDashboardStats(user),
    listEvents({ fromIso: todayStart, toIso: todayEnd }).catch(() => [] as AgendaEvent[]),
  ]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      {user.plan !== "pro" && <OfferBanner startedAt={user.offer_started_at} />}
      <Greeting user={user} />
      <MetricChips stats={stats} />

      <div className="mb-8">
        <Pomodoro focusToday={stats.focus_sessions_count} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        <LevelCard user={user} />
        <AgendaPreview events={todayEvents} />
      </div>
    </div>
  );
}
