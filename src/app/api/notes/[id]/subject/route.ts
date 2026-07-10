import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveActor();

  const { id } = await params;
  const { subject_id } = await req.json();

  const sb = supabaseAdmin();

  const { error } = await sb
    .from("notes")
    .update({ subject_id: subject_id ?? null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
