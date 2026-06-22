import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: user } = await sb.from("users").select("id").eq("clerk_user_id", userId).single();
  if (!user) return NextResponse.json({ error: "user_not_found" }, { status: 404 });

  const { data, error } = await sb.from("subjects").insert({
    user_id: user.id,
    name: body.name,
    color: body.color ?? "#4f7dff",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subject: data });
}
