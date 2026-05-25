"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Note } from "@/lib/types";

const BUCKET = "notes-uploads";

async function requireUserRow() {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const sb = supabaseAdmin();
  const { data } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (!data) throw new Error("user_row_missing");
  return { sb, user_id: data.id as string };
}

export async function listNotes(): Promise<Note[]> {
  const { sb, user_id } = await requireUserRow();
  const { data, error } = await sb
    .from("notes")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[notes.list]", error);
    return [];
  }
  return (data ?? []) as Note[];
}

export async function deleteNote(id: string) {
  const { sb, user_id } = await requireUserRow();

  // Buscar para conseguir el file_path
  const { data: note } = await sb
    .from("notes")
    .select("file_path")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();

  if (note?.file_path) {
    await sb.storage.from(BUCKET).remove([note.file_path]);
  }

  const { error } = await sb
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);

  if (error) throw new Error(error.message);

  revalidatePath("/app/apuntes");
  revalidatePath("/app/comunidad");
}

export async function toggleNotePublic(id: string) {
  const { sb, user_id } = await requireUserRow();
  const { data: current } = await sb
    .from("notes")
    .select("is_public")
    .eq("id", id)
    .eq("user_id", user_id)
    .single();
  if (!current) throw new Error("not_found");

  const { error } = await sb
    .from("notes")
    .update({ is_public: !current.is_public })
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/apuntes");
  revalidatePath("/app/comunidad");
}
