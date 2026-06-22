import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EspacioClient, SEC_COLORS } from "./_components/espacio-client";
import { EspacioEmpty } from "./_components/espacio-empty";

type SearchParams = Promise<{ note_id?: string; gen?: string }>;

export default async function IAPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { note_id, gen } = await searchParams;
  const sb = supabaseAdmin();

  const { data: userRow } = await sb.from("users").select("id").eq("clerk_user_id", userId).single();
  if (!userRow) redirect("/login");

  // Sin note_id: redirigir a la nota más reciente, o mostrar vacío
  if (!note_id) {
    const { data: latest } = await sb
      .from("notes")
      .select("id")
      .eq("user_id", userRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (latest) redirect(`/app/ia?note_id=${latest.id}`);
    return <EspacioEmpty />;
  }

  const { data: note } = await sb
    .from("notes")
    .select("*")
    .eq("id", note_id)
    .eq("user_id", userRow.id)
    .single();
  if (!note) redirect("/app/ia");

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Sin materia"
    : "Sin materia";

  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("kind, content")
    .eq("note_id", note_id)
    .eq("user_id", userRow.id);

  const summaryOutput = outputs?.find((o) => o.kind === "summary");
  const flashcardsOutput = outputs?.find((o) => o.kind === "flashcards");
  const simulacroOutput = outputs?.find((o) => o.kind === "simulacro");

  type Point = { emoji?: string; title: string; description?: string; category?: string };
  const points: Point[] = (summaryOutput?.content as { points?: Point[] })?.points ?? [];

  const secMap = new Map<string, Point[]>();
  points.forEach((p) => {
    const cat = p.category ?? "General";
    if (!secMap.has(cat)) secMap.set(cat, []);
    secMap.get(cat)!.push(p);
  });

  const sections = Array.from(secMap.entries()).map(([name, pts], si) => ({
    id: `sec-${si}`,
    name,
    color: SEC_COLORS[si % SEC_COLORS.length],
    topics: pts.map((p, ti) => ({
      id: `topic-${si}-${ti}`,
      name: p.emoji ? `${p.emoji} ${p.title}` : p.title,
      sub: p.description ? p.description.slice(0, 60) + (p.description.length > 60 ? "…" : "") : "",
      pct: 0,
    })),
  }));

  type Flashcard = { front?: string };
  type SimulacroPregunta = { pregunta?: string; question?: string };
  const flashcardsContent = flashcardsOutput?.content as { flashcards?: Flashcard[] } | null;
  const simulacroContent = simulacroOutput?.content as { questions?: SimulacroPregunta[] } | null;

  const noteData = {
    id: note.id,
    title: note.title,
    subjectName,
    summaryCount: points.length,
    flashcardsCount: flashcardsContent?.flashcards?.length ?? 0,
    simulacroCount: simulacroContent?.questions?.length ?? 0,
    sections,
  };

  return (
    <EspacioClient
      note={noteData}
      generating={gen === "1" && (!outputs || outputs.length === 0)}
      fileName={note.file_name ?? note.title}
    />
  );
}
