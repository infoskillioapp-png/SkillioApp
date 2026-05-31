"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AgendaEvent, EventKind } from "@/lib/types";

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

export async function listEvents(opts?: {
  fromIso?: string;
  toIso?: string;
}): Promise<AgendaEvent[]> {
  const { sb, user_id } = await requireUserRow();
  let q = sb
    .from("events")
    .select("*")
    .eq("user_id", user_id)
    .order("starts_at", { ascending: true });
  if (opts?.fromIso) q = q.gte("starts_at", opts.fromIso);
  if (opts?.toIso) q = q.lte("starts_at", opts.toIso);
  const { data, error } = await q;
  if (error) {
    console.error("[events.list]", error);
    return [];
  }
  return (data ?? []) as AgendaEvent[];
}

export type EventInput = {
  id?: string;
  subject_id: string;
  title: string;
  kind: EventKind;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM (optional)
  room: string;
  professor: string;
  notes: string;
};

function toIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  // Adjuntamos el offset de Argentina (UTC-3, sin DST) para que Postgres
  // almacene el timestamp correcto sin convertir a UTC desde el servidor.
  const iso = `${date}T${time}:00-03:00`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return iso;
}

export async function upsertEvent(input: EventInput) {
  const { sb, user_id } = await requireUserRow();

  if (!input.title?.trim()) throw new Error("title_required");
  const starts_at = toIso(input.date, input.start_time);
  if (!starts_at) throw new Error("invalid_date");
  const ends_at = input.end_time ? toIso(input.date, input.end_time) : null;

  const payload = {
    user_id,
    subject_id: input.subject_id || null,
    title: input.title.trim(),
    kind: input.kind,
    starts_at,
    ends_at,
    room: input.room?.trim() || null,
    professor: input.professor?.trim() || null,
    notes: input.notes?.trim() || null,
  };

  if (input.id) {
    const { error } = await sb
      .from("events")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user_id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("events").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/app/agenda");
  revalidatePath("/app");
}

export async function deleteEvent(id: string) {
  const { sb, user_id } = await requireUserRow();
  const { error } = await sb
    .from("events")
    .delete()
    .eq("id", id)
    .eq("user_id", user_id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/agenda");
  revalidatePath("/app");
}
