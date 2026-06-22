import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPaidPlan } from "@/lib/ai/claude";
import { TarjetasClient } from "./_components/tarjetas-client";
import type { TarjetasData } from "./_components/tarjetas-client";

type SearchParams = Promise<{ note_id?: string }>;

type FlashcardRow = { front: string; back: string; category?: string };
type FlashcardsContent = { flashcards?: FlashcardRow[] };

export default async function TarjetasPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { note_id } = await searchParams;
  if (!note_id) redirect("/app");

  const sb = supabaseAdmin();

  const { data: userRow } = await sb.from("users").select("id,plan,expires_at").eq("clerk_user_id", userId).single();
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
    .eq("kind", "flashcards")
    .single();

  const content = output?.content as FlashcardsContent | null;
  const flashcards = content?.flashcards ?? [];

  if (flashcards.length === 0) redirect(`/app/ia?note_id=${note_id}`);

  const data: TarjetasData = {
    noteId: note.id,
    noteTitle: note.title,
    subjectName,
    flashcards,
  };

  const isPro = isPaidPlan(userRow.plan, userRow.expires_at ?? null);

  return <TarjetasClient data={data} isPro={isPro} />;
}
