import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SimulacroClient } from "./_components/simulacro-client";
import type { SimulacroData, SimQuestion } from "./_components/simulacro-client";

type SearchParams = Promise<{ note_id?: string }>;

type SimulacroContent = {
  title?: string;
  questions?: SimQuestion[];
};

export default async function SimulacroPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { note_id } = await searchParams;
  if (!note_id) redirect("/app");

  const sb = supabaseAdmin();

  const { data: userRow } = await sb.from("users").select("id").eq("clerk_user_id", userId).single();
  if (!userRow) redirect("/login");

  const { data: note } = await sb.from("notes").select("id,title,subject_id").eq("id", note_id).eq("user_id", userRow.id).single();
  if (!note) redirect("/app");

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Sin materia"
    : "Sin materia";

  const { data: output } = await sb
    .from("ai_outputs")
    .select("content")
    .eq("note_id", note_id)
    .eq("user_id", userRow.id)
    .eq("kind", "simulacro")
    .single();

  const content = output?.content as SimulacroContent | null;
  const questions: SimQuestion[] = content?.questions ?? [];

  if (questions.length === 0) redirect(`/app/ia?note_id=${note_id}`);

  const data: SimulacroData = {
    noteId: note.id,
    noteTitle: note.title,
    subjectName,
    questions,
  };

  return <SimulacroClient data={data} />;
}
