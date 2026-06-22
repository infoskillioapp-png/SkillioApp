import { redirect } from "next/navigation";
import { getCurrentSkillioUser, getDashboardStats } from "@/lib/db";
import { listEvents } from "@/lib/api/events";
import { listSubjects } from "@/lib/api/subjects";
import { listAiOutputs } from "@/lib/api/ai-outputs";
import { MetricChips } from "./_components/dashboard/metric-chips";
import { Pomodoro } from "./_components/dashboard/pomodoro";
import { AgendaPreview } from "./_components/dashboard/agenda-preview";
import { DashboardHero, DashboardContinuar, DashboardMaterias } from "./_components/dashboard/hero-card";
import type { AgendaEvent } from "@/lib/types";

export default async function DashboardPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

  const [stats, todayEvents, subjects, recentOutputs] = await Promise.all([
    getDashboardStats(user),
    listEvents({ fromIso: todayStart, toIso: todayEnd }).catch(() => [] as AgendaEvent[]),
    listSubjects(),
    listAiOutputs(1),
  ]);

  const firstName = user.full_name?.split(" ")[0] ?? user.email.split("@")[0];
  const lastOutput = recentOutputs[0] ?? null;

  return (
    <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-5xl mx-auto space-y-6">

      {/* 1 — Hero */}
      <DashboardHero firstName={firstName} />

      {/* 2 — Stats chips */}
      <MetricChips stats={stats} />

      {/* 3 — Continuar + Agenda/Pomodoro */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <DashboardContinuar lastOutput={lastOutput} />
        <AgendaPreview events={todayEvents} />
      </div>

      {/* 4 — Pomodoro */}
      <Pomodoro focusToday={stats.focus_sessions_count} />

      {/* 5 — Mis materias */}
      <DashboardMaterias subjects={subjects} />

    </div>
  );
}
