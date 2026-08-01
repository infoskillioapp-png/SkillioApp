import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readSummaryMarkdown } from "@/lib/notes/summary-markdown";
import { EscucharClient } from "./_components/escuchar-client";

type SearchParams = Promise<{ note_id?: string }>;

export default async function EscucharPage({ searchParams }: { searchParams: SearchParams }) {
  const { note_id } = await searchParams;
  if (!note_id) redirect("/app");

  const actor = await getActorReadonly();
  if (!actor) redirect("/app");

  const sb = supabaseAdmin();
  const { data: note } = await sb
    .from("notes")
    .select("id, title, subject_id")
    .eq("id", note_id)
    .eq("user_id", actor.id)
    .single();
  if (!note) redirect("/app");

  // Sin resumen generado aún → al espacio (donde puede generarlo).
  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("kind, content")
    .eq("note_id", note_id)
    .eq("user_id", actor.id);
  const md = readSummaryMarkdown(outputs?.find((o) => o.kind === "summary")?.content);
  if (!md) redirect(`/app/ia?note_id=${note_id}`);

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name
    : null;
  const topicLabel = subjectName && subjectName !== "Sin materia" ? subjectName : note.title;

  return <EscucharClient noteId={note.id} topicLabel={topicLabel} />;
}
