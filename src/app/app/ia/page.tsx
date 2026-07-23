import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { isPaidPlan } from "@/lib/ai/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EspacioClient, SEC_COLORS } from "./_components/espacio-client";
import { EspacioEmpty } from "./_components/espacio-empty";
import { isDemoNoteId, getDemoResumen, getDemoTarjetas, getDemoSimulacro } from "@/lib/demo-content";
import { parseSummaryMarkdown, readSummaryMarkdown, type SummarySection } from "@/lib/notes/summary-markdown";

type SearchParams = Promise<{ note_id?: string; gen?: string }>;

// Preview corto de una sección markdown (para el subtítulo del tema en el mapa).
function sectionSnippet(md: string): string {
  const line = md.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("|") && !l.startsWith("-"));
  const raw = (line ?? md).replace(/^[-*#>\s]+/, "").replace(/\*\*/g, "").trim();
  return raw ? raw.slice(0, 60) + (raw.length > 60 ? "…" : "") : "";
}

// Un grupo "Resumen" con cada sección '## ' del markdown como un tema navegable.
// Los ids (topic-<noteId>-<idx>) coinciden con los que marca la página del
// resumen, para que el progreso ("dominado") se sincronice entre ambas.
function sectionsToEspacio(noteId: string, sections: SummarySection[]) {
  if (!sections.length) return [];
  return [
    {
      id: "sec-0",
      name: "Resumen",
      color: SEC_COLORS[0],
      topics: sections.map((sec, i) => ({
        id: `topic-${noteId}-${i}`,
        name: sec.heading,
        sub: sectionSnippet(sec.markdown),
        pct: 0,
      })),
    },
  ];
}

export default async function IAPage({ searchParams }: { searchParams: SearchParams }) {
  const { note_id } = await searchParams;

  // Demo: espacio completo con datos hardcodeados, disponible sin cuenta.
  if (note_id && isDemoNoteId(note_id)) {
    const demoResumen = getDemoResumen(note_id);
    if (!demoResumen) redirect("/app/ia");

    const demoTarjetas = getDemoTarjetas(note_id);
    const demoSimulacro = getDemoSimulacro(note_id);

    const demoNoteData = {
      id: note_id,
      title: demoResumen.noteTitle,
      subjectName: demoResumen.subjectName,
      summaryCount: demoResumen.sections.length,
      flashcardsCount: demoTarjetas?.flashcards.length ?? 0,
      simulacroCount: demoSimulacro?.questions.length ?? 0,
      sections: sectionsToEspacio(note_id, demoResumen.sections),
      fileUrl: null,
    };

    return <EspacioClient note={demoNoteData} generating={false} fileName={demoResumen.noteTitle} isPro />;
  }

  // Identidad: Clerk o sesión anónima (free). Sin actor → a la home.
  const actor = await getActorReadonly();
  if (!actor) redirect("/app");

  const sb = supabaseAdmin();

  // Sin note_id: redirigir a la nota más reciente, o mostrar vacío
  if (!note_id) {
    const { data: latest } = await sb
      .from("notes")
      .select("id")
      .eq("user_id", actor.id)
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
    .eq("user_id", actor.id)
    .single();
  if (!note) redirect("/app/ia");

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Sin materia"
    : "Sin materia";

  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("kind, content")
    .eq("note_id", note_id)
    .eq("user_id", actor.id);

  const summaryOutput = outputs?.find((o) => o.kind === "summary");
  const flashcardsOutput = outputs?.find((o) => o.kind === "flashcards");
  const simulacroOutput = outputs?.find((o) => o.kind === "simulacro");

  // El resumen ahora es Markdown: cada '## ' es un tema del mapa de estudio.
  const summaryMd = readSummaryMarkdown(summaryOutput?.content);
  const summarySections = summaryMd ? parseSummaryMarkdown(summaryMd).sections : [];
  const sections = sectionsToEspacio(note.id, summarySections);

  type Flashcard = { front?: string };
  type SimulacroPregunta = { pregunta?: string; question?: string };
  const flashcardsContent = flashcardsOutput?.content as { cards?: Flashcard[]; flashcards?: Flashcard[] } | null;
  const simulacroContent = simulacroOutput?.content as { questions?: SimulacroPregunta[] } | null;

  let fileUrl: string | null = null;
  if (note.file_path) {
    const { data: signed } = await sb.storage.from("notes-uploads").createSignedUrl(note.file_path, 3600);
    fileUrl = signed?.signedUrl ?? null;
  }

  const noteData = {
    id: note.id,
    title: note.title,
    subjectName,
    summaryCount: summarySections.length,
    flashcardsCount: (flashcardsContent?.cards ?? flashcardsContent?.flashcards)?.length ?? 0,
    simulacroCount: simulacroContent?.questions?.length ?? 0,
    sections,
    fileUrl,
  };

  // Auto-generar SOLO si falta el resumen. Tarjetas y simulacro están en pausa:
  // no disparan el overlay automático — quedan en "Tocá para generar" y se
  // generan cuando el usuario las toca. (Ver ALL_KINDS / AUTO_GEN_KINDS.)
  const needsGeneration = !summaryOutput;

  return (
    <EspacioClient
      note={noteData}
      generating={needsGeneration}
      fileName={note.file_name ?? note.title}
      isPro={isPaidPlan(actor.plan, actor.expires_at)}
    />
  );
}
