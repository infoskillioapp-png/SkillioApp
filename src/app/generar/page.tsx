import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GenerarClient } from "./_components/generar-client";

export const metadata = {
  title: "Generá tu resumen con IA — Skillio",
  description: "Subí tu apunte y obtené un resumen de estudio en segundos. Sin registro.",
};

// Entrada pública del embudo (registro diferido). Si el visitante anónimo ya
// generó su resumen gratis, no puede volver a generar: lo mandamos directo a su
// resultado.
export default async function GenerarPage() {
  const session = (await cookies()).get("skillio_anon")?.value;
  if (session) {
    const sb = supabaseAdmin();
    const { data: u } = await sb
      .from("users")
      .select("id")
      .eq("anon_session_id", session)
      .maybeSingle();
    if (u) {
      const { data: out } = await sb
        .from("ai_outputs")
        .select("id")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (out) redirect(`/r/${out.id}`);
    }
  }
  return <GenerarClient />;
}
