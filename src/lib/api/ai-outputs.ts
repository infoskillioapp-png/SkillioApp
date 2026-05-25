import "server-only";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type AiOutputKind = "summary" | "flashcards" | "simulacro";

export type AiOutputRow = {
  id: string;
  user_id: string;
  note_id: string | null;
  kind: AiOutputKind;
  format: string | null;
  title: string | null;
  content: unknown;
  credits_used: number;
  model: string;
  created_at: string;
};

export async function listAiOutputs(limit = 10): Promise<AiOutputRow[]> {
  const { userId } = await auth();
  if (!userId) return [];
  const sb = supabaseAdmin();
  const { data: u } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!u) return [];

  const { data, error } = await sb
    .from("ai_outputs")
    .select("*")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[ai-outputs.list]", error);
    return [];
  }
  return (data ?? []) as AiOutputRow[];
}
