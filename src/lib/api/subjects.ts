"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Subject } from "@/lib/types";

async function requireUserRow() {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthenticated");
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .single();
  if (error || !data) throw new Error("user_row_missing");
  return { sb, user_id: data.id as string };
}

export async function listSubjects(): Promise<Subject[]> {
  const { sb, user_id } = await requireUserRow();
  const { data, error } = await sb
    .from("subjects")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[subjects.list]", error);
    return [];
  }
  return (data ?? []) as Subject[];
}

export type SubjectInput = {
  id?: string;
  code: string;
  name: string;
  professor: string;
  color: string;
  avg_grade: string;
  hours_studied: string;
  attendance_pct: string;
  exam1_grade?: string;
  exam2_grade?: string;
  exam3_grade?: string;
};

function parseInput(input: SubjectInput) {
  const name = input.name?.trim();
  if (!name) throw new Error("name_required");
  return {
    code: input.code?.trim() || null,
    name,
    professor: input.professor?.trim() || null,
    color: input.color?.trim() || "#A5402D",
    avg_grade: input.avg_grade ? Number(input.avg_grade) : null,
    hours_studied: input.hours_studied ? Number(input.hours_studied) : 0,
    attendance_pct: input.attendance_pct ? Number(input.attendance_pct) : 100,
    exam1_grade: input.exam1_grade ? Number(input.exam1_grade) : null,
    exam2_grade: input.exam2_grade ? Number(input.exam2_grade) : null,
    exam3_grade: input.exam3_grade ? Number(input.exam3_grade) : null,
  };
}

export async function upsertSubject(input: SubjectInput) {
  const { sb, user_id } = await requireUserRow();
  const payload = parseInput(input);

  if (input.id) {
    const { error } = await sb
      .from("subjects")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user_id);
    if (error) {
      console.error("[subjects.update]", error);
      throw new Error(error.message);
    }
  } else {
    const { error } = await sb
      .from("subjects")
      .insert({ ...payload, user_id });
    if (error) {
      console.error("[subjects.insert]", error);
      throw new Error(error.message);
    }
  }

  revalidatePath("/app/materias");
  revalidatePath("/app");
}

export async function deleteSubject(id: string) {
  const { sb, user_id } = await requireUserRow();
  const { error } = await sb
    .from("subjects")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) {
    console.error("[subjects.delete]", error);
    throw new Error(error.message);
  }
  revalidatePath("/app/materias");
}
