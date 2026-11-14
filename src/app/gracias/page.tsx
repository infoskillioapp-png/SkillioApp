import { getActorReadonly } from "@/lib/actor";
import { GraciasClient } from "./_components/gracias-client";

// Pantalla de gracias post-pago. Momento de celebración + confirmación de que
// el plan quedó activo, antes de entrar a la app. El texto cambia según el plan
// (Pase de cuatrimestre: pago único con fecha de fin / Mensual: suscripción).
export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const sp = await searchParams;
  const actor = await getActorReadonly();
  const plan = actor && actor.plan !== "free" ? actor.plan : sp.plan === "pase" ? "pase" : "pro";
  return <GraciasClient plan={plan} expiresAt={plan === "pase" ? actor?.expires_at ?? null : null} />;
}
