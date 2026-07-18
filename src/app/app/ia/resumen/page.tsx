import { redirect } from "next/navigation";
import { isPaidPlan } from "@/lib/ai/claude";
import { isDemoNoteId, getDemoResumen, getDemoSimulacro } from "@/lib/demo-content";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ResumenClient } from "./_components/resumen-client";
import type { ResumenData, QuizQuestion, SummaryPoint } from "./_components/resumen-client";

// Demo: convierte las preguntas MC del simulacro hardcodeado en un pool para la
// práctica rápida (mismo formato), sin IA.
function demoPracticaPool(noteId: string): QuizQuestion[] {
  const sim = getDemoSimulacro(noteId);
  if (!sim) return [];
  return sim.questions
    .filter((q): q is Extract<typeof q, { kind: "multiple_choice" }> => q.kind === "multiple_choice")
    .map((q) => ({ pregunta: q.question, opciones: q.options, correcta: q.correct, explicacion: q.explanation }));
}

type SearchParams = Promise<{ note_id?: string; s?: string }>;

type SummaryContent = { title?: string; intro?: string; points?: SummaryPoint[] };


export default async function ResumenPage({ searchParams }: { searchParams: SearchParams }) {
  const { note_id, s } = await searchParams;
  if (!note_id) redirect("/app");

  // Link de rescate cross-device (?s=…): adoptamos la sesión anónima y volvemos
  // limpios (sin el parámetro). No se puede setear la cookie desde acá (Server
  // Component en render), por eso pasa por el route handler.
  if (s) redirect(`/api/public/adopt?s=${encodeURIComponent(s)}&note_id=${encodeURIComponent(note_id)}`);

  // Identidad: Clerk o sesión anónima (free). El invitado ve el resumen con el
  // mismo tope de free (3 visibles, resto bloqueado) — isPro real.
  const actor = await getActorReadonly();

  // Demo: contenido hardcodeado, cero tokens. Disponible sin cuenta y bloqueado
  // igual que un free (isPro según el plan real del actor).
  if (isDemoNoteId(note_id)) {
    const demoData = getDemoResumen(note_id);
    if (!demoData) redirect("/app");
    const isProDemo = actor ? isPaidPlan(actor.plan, actor.expires_at) : false;
    return (
      <ResumenClient
        data={demoData}
        isPro={isProDemo}
        isDemo
        isGuest={!actor || actor.isAnon}
        demoPractica={demoPracticaPool(note_id)}
      />
    );
  }

  if (!actor) redirect("/app");

  const sb = supabaseAdmin();

  const { data: note } = await sb.from("notes").select("id,title,subject_id,file_path").eq("id", note_id).eq("user_id", actor.id).single();
  if (!note) redirect("/app");

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Sin materia"
    : "Sin materia";

  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("kind, content")
    .eq("note_id", note_id)
    .eq("user_id", actor.id);

  // La API guarda content = { format, data: SummaryContent }
  type SummaryWrapper = { data?: SummaryContent } & SummaryContent;
  const summaryWrapper = outputs?.find((o) => o.kind === "summary")?.content as SummaryWrapper | null;
  const summaryRaw: SummaryContent | null = summaryWrapper?.data ?? summaryWrapper ?? null;

  const rawPoints: SummaryPoint[] = summaryRaw?.points ?? [];

  // Agrupar puntos por category → sections
  const secMap = new Map<string, SummaryPoint[]>();
  rawPoints.forEach((p) => {
    const cat = p.category ?? "General";
    if (!secMap.has(cat)) secMap.set(cat, []);
    secMap.get(cat)!.push(p);
  });

  const sections = Array.from(secMap.entries()).map(([name, points]) => ({ name, points }));

  // URL del archivo original (para "Resumen completo")
  const { data: fileSignedUrl } = await sb.storage
    .from("notes-uploads")
    .createSignedUrl(note.file_path, 3600);

  const data: ResumenData = {
    noteId: note.id,
    noteTitle: note.title,
    subjectName,
    intro: summaryRaw?.intro ?? "",
    sections: sections.length > 0 ? sections : [{ name: "Contenido", points: rawPoints }],
    fileUrl: fileSignedUrl?.signedUrl ?? null,
  };

  if (rawPoints.length === 0) redirect(`/app/ia?note_id=${note_id}`);

  const isPro = isPaidPlan(actor.plan, actor.expires_at);

  return <ResumenClient data={data} isPro={isPro} isGuest={actor.isAnon} />;
}
