import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await params;
  const { subject_id } = await req.json();

  const sb = supabaseAdmin();
  const { data: user } = await sb.from("users").select("id").eq("clerk_user_id", userId).single();
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await sb
    .from("notes")
    .update({ subject_id: subject_id ?? null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
