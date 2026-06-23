import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isPaidPlan } from "@/lib/ai/claude";
import { ResumenClient } from "./_components/resumen-client";
import type { ResumenData } from "./_components/resumen-client";

type SearchParams = Promise<{ note_id?: string }>;

type SummaryPoint = { emoji?: string; title: string; description: string; category?: string };
type SummaryContent = { title?: string; intro?: string; points?: SummaryPoint[] };


export default async function ResumenPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { note_id } = await searchParams;
  if (!note_id) redirect("/app");

  const sb = supabaseAdmin();

  const { data: userRow } = await sb.from("users").select("id,plan,expires_at").eq("clerk_user_id", userId).single();
  if (!userRow) redirect("/login");

  const { data: note } = await sb.from("notes").select("id,title,subject_id,file_path").eq("id", note_id).eq("user_id", userRow.id).single();
  if (!note) redirect("/app");

  const subjectName = note.subject_id
    ? (await sb.from("subjects").select("name").eq("id", note.subject_id).single()).data?.name ?? "Sin materia"
    : "Sin materia";

  const { data: outputs } = await sb
    .from("ai_outputs")
    .select("kind, content")
    .eq("note_id", note_id)
    .eq("user_id", userRow.id);

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

  const isPro = isPaidPlan(userRow.plan, userRow.expires_at ?? null);

  return <ResumenClient data={data} isPro={isPro} />;
}
