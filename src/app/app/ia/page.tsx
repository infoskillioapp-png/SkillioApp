import { redirect } from "next/navigation";
import { getCurrentSkillioUser } from "@/lib/db";
import { listNotes } from "@/lib/api/notes";
import { listAiOutputs } from "@/lib/api/ai-outputs";
import { listSubjects } from "@/lib/api/subjects";
import { IaView } from "./_components/ia-view";

export default async function IaPage() {
  const user = await getCurrentSkillioUser();
  if (!user) redirect("/login");

  const [notes, history, subjects] = await Promise.all([
    listNotes(),
    listAiOutputs(10),
    listSubjects(),
  ]);

  return (
    <div className="relative min-h-screen">
      {/* Fondo premium animado */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse at 20% 20%, rgba(165,64,45,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(74,107,138,0.07) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(244,201,105,0.04) 0%, transparent 60%)",
        }}
      />
      <div className="relative z-10 px-5 sm:px-10 py-6 sm:py-10 max-w-6xl mx-auto">
        <IaView
          notes={notes}
          subjects={subjects}
          credits={user.credits}
          plan={user.plan}
          expiresAt={user.expires_at}
          freeGenerationsUsed={user.free_generations_used}
          history={history}
        />
      </div>
    </div>
  );
}
