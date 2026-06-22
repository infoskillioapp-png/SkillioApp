import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ComunidadClient } from "./_components/comunidad-client";

type SearchParams = Promise<{ kind?: string; subject?: string }>;

export default async function ComunidadPage({ searchParams }: { searchParams: SearchParams }) {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const { kind, subject } = await searchParams;
  const sb = supabaseAdmin();

  let query = sb
    .from("notes")
    .select("id,title,comm_kind,comm_subject,comm_university,comm_career,comm_year,created_at,users(full_name)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (kind) query = query.eq("comm_kind", kind);
  if (subject) query = query.ilike("comm_subject", `%${subject}%`);

  const { data: notes } = await query;

  const feed = (notes ?? []).map((n) => {
    const u = Array.isArray(n.users) ? n.users[0] : n.users;
    return {
      id: n.id,
      title: n.title,
      kind: n.comm_kind ?? "apunte",
      subject: n.comm_subject ?? "",
      university: n.comm_university ?? "",
      career: n.comm_career ?? "",
      year: n.comm_year,
      likes: 0,
      downloads: 0,
      createdAt: n.created_at,
      authorName: (u as { full_name?: string } | null)?.full_name ?? "Anónimo",
    };
  });

  return <ComunidadClient feed={feed} activeKind={kind ?? ""} />;
}
