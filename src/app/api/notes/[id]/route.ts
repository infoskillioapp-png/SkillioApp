import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await resolveActor();

  const { id } = await params;
  const { title } = await req.json();

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title_required" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  const { error } = await sb
    .from("notes")
    .update({ title: title.trim() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
