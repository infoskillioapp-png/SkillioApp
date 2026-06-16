import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Note } from "@/lib/types";

export type PublicNote = Note & {
  uploader: {
    full_name: string | null;
    avatar_url: string | null;
    email: string;
  } | null;
  subject: { name: string; color: string } | null;
};

/**
 * Feed publico de apuntes compartidos.
 * Filtra por subject (texto libre matching) si se pasa search.
 */
export async function listPublicNotes(opts?: {
  search?: string;
  limit?: number;
}): Promise<PublicNote[]> {
  const sb = supabaseAdmin();
  const limit = opts?.limit ?? 200;

  let q = sb
    .from("notes")
    .select(
      "*, uploader:users!notes_user_id_fkey(full_name, avatar_url, email), subject:subjects(name, color)",
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.search?.trim()) {
    const s = opts.search.trim();
    q = q.or(`title.ilike.%${s}%,file_name.ilike.%${s}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[community.list]", error);
    return [];
  }
  return (data ?? []) as PublicNote[];
}
