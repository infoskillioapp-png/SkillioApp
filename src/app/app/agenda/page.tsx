import { listSubjects } from "@/lib/api/subjects";
import { listEvents } from "@/lib/api/events";
import { AgendaView } from "./_components/agenda-view";

export default async function AgendaPage() {
  const [events, subjects] = await Promise.all([listEvents(), listSubjects()]);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <AgendaView events={events} subjects={subjects} />
    </div>
  );
}
