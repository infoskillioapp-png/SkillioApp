import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { isPaidPlan } from "@/lib/ai/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidDiscountCode, isPlanKind, type PlanKind } from "@/lib/pricing";
import { PagarEmbeddedClient } from "./_components/pagar-embedded-client";

// Checkout EMBEBIDO (Bricks) de los 3 planes. Se llega desde el paywall por
// navegación interna (/pagar?plan=…) — el usuario no sale de Skillio.
export default async function PagarPage({ searchParams }: { searchParams: Promise<{ promo?: string; plan?: string }> }) {
  const actor = await getActorReadonly();
  if (actor && isPaidPlan(actor.plan, actor.expires_at)) redirect("/app");

  const { promo, plan } = await searchParams;
  const planKind: PlanKind = isPlanKind(plan) ? plan : "pro";
  // El link del mail de descuento trae ?promo=SKILLIO25 → arranca aplicado (solo pro).
  const initialPromo = planKind === "pro" && isValidDiscountCode(promo) ? promo!.trim().toUpperCase() : "";

  // Prefill del mail con el que ya capturamos (popups-regalo), si lo hay.
  let email = "";
  if (actor) {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("email")
      .eq("id", actor.id)
      .maybeSingle();
    email = data?.email ?? "";
  }

  return (
    <>
      {/* Adelantar el handshake con los dominios del SDK/Brick de MP: recorta
          los segundos de espera al cargar el formulario de tarjeta. */}
      <link rel="preconnect" href="https://sdk.mercadopago.com" crossOrigin="" />
      <link rel="preconnect" href="https://api.mercadopago.com" crossOrigin="" />
      <link rel="preconnect" href="https://http2.mlstatic.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://sdk.mercadopago.com" />
      <PagarEmbeddedClient initialEmail={email} initialPromo={initialPromo} plan={planKind} />
    </>
  );
}
