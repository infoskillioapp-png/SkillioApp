import { redirect } from "next/navigation";
import { isPaidPlan } from "@/lib/ai/claude";
import { isDemoNoteId, getDemoResumen } from "@/lib/demo-content";
import { getActorReadonly } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ResumenClient, type ResumenData } from "./_components/resumen-client";
import { parseSummaryMarkdown, readSummaryMarkdown } from "@/lib/notes/summary-markdown";

const FREE_SECTIONS = 2; // secciones reales visibles para free
const FREE_LOCKED_SLOTS = 6; // slots bloqueados decorativos ("hay más con PRO")

type SearchParams = Promise<{ note_id?: string; s?: string }>;

// Recorta el resumen para el plan free (no manda al cliente las secciones
// bloqueadas — no se filtran) y agrega los slots decorativos. Pro ve todo.
function applyFreeLock(full: ResumenData, isPro: boolean): ResumenData {
  if (isPro) return { ...full, lockedCount: 0 };
  return {
    ...full,
    sections: full.sections.slice(0, FREE_SECTIONS),
    lockedCount: FREE_LOCKED_SLOTS,
  };
}

export default async function ResumenPage({ searchParams }: { searchParams: SearchParams }) {
  const { note_id, s } = await searchParams;
  if (!note_id) redirect("/app");

  // Link de rescate cross-device (?s=…): adoptamos la sesión anónima y volvemos
  // limpios. La cookie se setea en el route handler.
  if (s) redirect(`/api/public/adopt?s=${encodeURIComponent(s)}&note_id=${encodeURIComponent(note_id)}`);

  const actor = await getActorReadonly();

  // Demo: contenido hardcodeado, cero tokens. Se muestra con el mismo candado
  // free que un apunte real (isPro según el plan real del actor).
  if (isDemoNoteId(note_id)) {
    const demoFull = getDemoResumen(note_id);
    if (!demoFull) redirect("/app");
    const isProDemo = actor ? isPaidPlan(actor.plan, actor.expires_at) : false;
    return (
      <ResumenClient
        data={applyFreeLock(demoFull, isProDemo)}
        isPro={isProDemo}
        isDemo
        isGuest={!actor || actor.isAnon}
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

  const summaryContent = outputs?.find((o) => o.kind === "summary")?.content;
  const md = readSummaryMarkdown(summaryContent);
  // Sin resumen generado aún → al espacio (donde puede generarlo).
  if (!md) redirect(`/app/ia?note_id=${note_id}`);

  const parsed = parseSummaryMarkdown(md);
  if (parsed.sections.length === 0) redirect(`/app/ia?note_id=${note_id}`);

  const { data: fileSignedUrl } = await sb.storage
    .from("notes-uploads")
    .createSignedUrl(note.file_path, 3600);

  const full: ResumenData = {
    noteId: note.id,
    noteTitle: note.title,
    subjectName,
    title: parsed.title,
    intro: parsed.intro,
    sections: parsed.sections,
    lockedCount: 0,
    fileUrl: fileSignedUrl?.signedUrl ?? null,
  };

  const isPro = isPaidPlan(actor.plan, actor.expires_at);
  return <ResumenClient data={applyFreeLock(full, isPro)} isPro={isPro} isGuest={actor.isAnon} />;
}
