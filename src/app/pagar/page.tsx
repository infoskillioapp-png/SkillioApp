import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { isPaidPlan } from "@/lib/ai/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidDiscountCode, toSellablePlan } from "@/lib/pricing";
import { PagarEmbeddedClient } from "./_components/pagar-embedded-client";

// Checkout EMBEBIDO de los 2 planes (Pase de cuatrimestre / Mensual). Se llega
// desde el paywall (/pagar?plan=…) o desde el mail del 25% (?promo=SKILLIO25).
// Sin ?plan arranca en el Pase. Links viejos (semanal/trimestral) → Pase.
export default async function PagarPage({ searchParams }: { searchParams: Promise<{ promo?: string; plan?: string }> }) {
  const actor = await getActorReadonly();
  if (actor && isPaidPlan(actor.plan, actor.expires_at)) redirect("/app");

  const { promo, plan } = await searchParams;
  const sellable = toSellablePlan(plan);
  const initialPromo = isValidDiscountCode(promo) ? promo!.trim().toUpperCase() : "";

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
      {/* Adelantar el handshake con los dominios del SDK/Brick de MP. */}
      <link rel="preconnect" href="https://sdk.mercadopago.com" crossOrigin="" />
      <link rel="preconnect" href="https://api.mercadopago.com" crossOrigin="" />
      <link rel="preconnect" href="https://http2.mlstatic.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://sdk.mercadopago.com" />
      <PagarEmbeddedClient initialEmail={email} initialPromo={initialPromo} plan={sellable} />
    </>
  );
}
