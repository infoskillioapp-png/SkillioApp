import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PublicResultClient, type ResultPoint } from "./_components/public-result-client";

export const metadata = {
  title: "Tu resumen — Skillio",
  robots: { index: false },
};

function isPaid(plan: string, expiresAt: string | null): boolean {
  if (plan === "pro") return true;
  if (plan === "semanal" || plan === "trimestral")
    return !!expiresAt && new Date(expiresAt) > new Date();
  return false;
}

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { id } = await params;
  const { s } = await searchParams;

  // Link de rescate cross-device: adoptamos la sesión y volvemos limpio (sin ?s).
  if (s) {
    redirect(`/api/public/adopt?s=${encodeURIComponent(s)}&to=/r/${encodeURIComponent(id)}`);
  }

  const session = (await cookies()).get("skillio_anon")?.value;
  const sb = supabaseAdmin();

  let owner: { id: string; plan: string; expires_at: string | null } | null = null;
  if (session) {
    const { data } = await sb
      .from("users")
      .select("id, plan, expires_at")
      .eq("anon_session_id", session)
      .maybeSingle();
    owner = data ?? null;
  }

  const { data: out } = await sb
    .from("ai_outputs")
    .select("id, user_id, title, content")
    .eq("id", id)
    .maybeSingle();

  // No existe, o no pertenece a esta sesión → pantalla de "no disponible".
  if (!out || !owner || out.user_id !== owner.id) {
    return <PublicResultClient notFound />;
  }

  const content = out.content as {
    format?: string;
    data?: { title?: string; intro?: string; points?: ResultPoint[] };
  };
  const points = content?.data?.points ?? [];

  return (
    <PublicResultClient
      outputId={out.id}
      title={content?.data?.title || out.title || "Tu resumen"}
      intro={content?.data?.intro ?? null}
      points={points}
      isPaid={isPaid(owner.plan, owner.expires_at)}
    />
  );
}
