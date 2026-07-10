import { NextResponse } from "next/server";
import { resolveActor } from "@/lib/actor";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const user = await resolveActor();

  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const sb = supabaseAdmin();

  const { data, error } = await sb.from("subjects").insert({
    user_id: user.id,
    name: body.name,
    color: body.color ?? "#4f7dff",
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, subject: data });
}
