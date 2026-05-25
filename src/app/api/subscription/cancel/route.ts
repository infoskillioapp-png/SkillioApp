import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const sb = supabaseAdmin();

  const { data: u, error: ue } = await sb
    .from("users")
    .select("id, plan")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (ue || !u) return NextResponse.json({ error: "user not found" }, { status: 404 });

  const { error } = await sb
    .from("users")
    .update({ plan: "free", updated_at: new Date().toISOString() })
    .eq("id", u.id);

  if (error) {
    console.error("[api/subscription/cancel]", error);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
