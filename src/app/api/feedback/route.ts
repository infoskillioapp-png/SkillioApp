import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  const rating = Number(body.rating);
  const comment = (body.comment ?? "").trim().slice(0, 1000);
  const page = (body.page ?? "").slice(0, 100);

  if (!rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: "rating inválido" }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: user } = await sb
    .from("users")
    .select("id")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  await sb.from("feedback").insert({
    user_id: user?.id ?? null,
    rating,
    comment: comment || null,
    page: page || null,
  });

  return NextResponse.json({ ok: true });
}
