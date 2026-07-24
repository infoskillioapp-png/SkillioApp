import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isDemoNoteId, getDemoSimulacro } from "@/lib/demo-content";
import { GameClient, type GameQuestion } from "./_components/game-client";
import type { SimQuestion } from "../simulacro/_components/simulacro-client";

type SearchParams = Promise<{ note_id?: string }>;

const MAX_QUESTIONS = 15;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Arma una GameQuestion barajando las opciones y recalculando el índice correcto.
function build(question: string, opts: { text: string; correct: boolean }[], explanation: string): GameQuestion {
  const s = shuffle(opts);
  return {
    question,
    options: s.map((o) => o.text),
    correctIndex: s.findIndex((o) => o.correct),
    explanation,
  };
}

// Convierte el simulacro en preguntas jugables. Opción múltiple → 4 opciones;
// verdadero/falso → 2 opciones. Las de desarrollo corto no se pueden jugar rápido.
function normalize(questions: SimQuestion[]): GameQuestion[] {
  const out: GameQuestion[] = [];
  for (const q of questions) {
    if (q.kind === "multiple_choice" && Array.isArray(q.options) && q.options.length >= 2) {
      out.push(build(q.question, q.options.map((text, i) => ({ text, correct: i === q.correct })), q.explanation));
    } else if (q.kind === "true_false") {
      out.push(build(q.question, [
        { text: "Verdadero", correct: q.correct === true },
        { text: "Falso", correct: q.correct === false },
      ], q.explanation));
    }
  }
  return shuffle(out).slice(0, MAX_QUESTIONS);
}

export default async function JugarPage({ searchParams }: { searchParams: SearchParams }) {
  const { note_id } = await searchParams;
  if (!note_id) redirect("/app");

  // Demo: se puede jugar con el simulacro hardcodeado, sin cuenta ni persistencia.
  if (isDemoNoteId(note_id)) {
    const demo = getDemoSimulacro(note_id);
    const questions = demo ? normalize(demo.questions as SimQuestion[]) : [];
    if (!questions.length) redirect(`/app/ia/simulacro?note_id=${note_id}`);
    return <GameClient noteId={note_id} noteTitle={demo?.noteTitle ?? "Juego"} questions={questions} bestScore={0} isDemo />;
  }

  const actor = await getActorReadonly();
  if (!actor) redirect("/app");

  const sb = supabaseAdmin();
  const { data: note } = await sb.from("notes").select("id,title").eq("id", note_id).eq("user_id", actor.id).single();
  if (!note) redirect("/app");

  const { data: output } = await sb
    .from("ai_outputs")
    .select("content")
    .eq("note_id", note_id)
    .eq("user_id", actor.id)
    .eq("kind", "simulacro")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const content = output?.content as { questions?: SimQuestion[] } | null;
  const questions = normalize(content?.questions ?? []);
  // Sin simulacro (o sin preguntas jugables) → al espacio a generarlo primero.
  if (!questions.length) redirect(`/app/ia?note_id=${note_id}`);

  const { data: gs } = await sb
    .from("game_scores")
    .select("best_score")
    .eq("user_id", actor.id)
    .eq("note_id", note_id)
    .maybeSingle();

  return (
    <GameClient
      noteId={note.id}
      noteTitle={note.title}
      questions={questions}
      bestScore={gs?.best_score ?? 0}
    />
  );
}
