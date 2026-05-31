import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ plan: "free" });

  const { data } = await supabaseAdmin()
    .from("users")
    .select("plan")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  return NextResponse.json({ plan: data?.plan ?? "free" });
}
