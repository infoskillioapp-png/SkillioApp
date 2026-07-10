import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPaidPlan } from "@/lib/ai/claude";
import { isDemoNoteId, getDemoTarjetas } from "@/lib/demo-content";
import { TarjetasClient } from "./_components/tarjetas-client";
import type { TarjetasData } from "./_components/tarjetas-client";

type SearchParams = Promise<{ note_id?: string }>;

type FlashcardRow = { front: string; back: string; category?: string };
// API guarda "cards" (FlashcardsSchema.cards), soportar también "flashcards" para compat.
type FlashcardsContent = { cards?: FlashcardRow[]; flashcards?: FlashcardRow[] };

export default async function TarjetasPage({ searchParams }: { searchParams: SearchParams }) {
  const { note_id } = await searchParams;
  if (!note_id) redirect("/app");

  // Identidad: Clerk o sesión anónima (free). El invitado ve las tarjetas con el
  // mismo tope de free (3 visibles, paywall en la 4ta) — por eso pasa isPro real.
  const actor = await getActorReadonly();

  if (isDemoNoteId(note_id)) {
    const demoData = getDemoTarjetas(note_id);
    if (!demoData) redirect("/app");
    const isProDemo = actor ? isPaidPlan(actor.plan, actor.expires_at) : false;
    return <TarjetasClient data={demoData} isPro={isProDemo} />;
  }

  if (!actor) redirect("/app");

  const sb = supabaseAdmin();

  const { data: note } = await sb.from("notes").select("id,title,subject_id").eq("id", note_id).eq("user_id", actor.id).single();
  if (!note) redirect("/app");

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Sin materia"
    : "Sin materia";

  // .limit(1) en vez de .single() para evitar error si hay múltiples registros
  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("content")
    .eq("note_id", note_id)
    .eq("user_id", actor.id)
    .eq("kind", "flashcards")
    .order("created_at", { ascending: false })
    .limit(1);

  const content = (outputs?.[0]?.content ?? null) as FlashcardsContent | null;
  const flashcards = content?.cards ?? content?.flashcards ?? [];

  if (flashcards.length === 0) redirect(`/app/ia?note_id=${note_id}`);

  const data: TarjetasData = {
    noteId: note.id,
    noteTitle: note.title,
    subjectName,
    flashcards,
  };

  const isPro = isPaidPlan(actor.plan, actor.expires_at);

  return <TarjetasClient data={data} isPro={isPro} />;
}
