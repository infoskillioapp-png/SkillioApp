import { listSubjects } from "@/lib/api/subjects";
import { SubjectsView } from "./_components/subjects-view";

export default async function MateriasPage() {
  const subjects = await listSubjects();
  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <SubjectsView subjects={subjects} />
    </div>
  );
}
