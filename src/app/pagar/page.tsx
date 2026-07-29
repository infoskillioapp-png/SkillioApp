import { redirect } from "next/navigation";
import { getActorReadonly } from "@/lib/actor";
import { isPaidPlan } from "@/lib/ai/claude";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidDiscountCode } from "@/lib/pricing";
import { PagarEmbeddedClient } from "./_components/pagar-embedded-client";

// Checkout EMBEBIDO del plan Mensual (Bricks). Se llega desde el paywall
// (botón "Mensual PRO") por navegación interna — el usuario no sale de Skillio.
// Semanal/Trimestral siguen con Checkout Pro desde el propio paywall.
export default async function PagarPage({ searchParams }: { searchParams: Promise<{ promo?: string }> }) {
  const actor = await getActorReadonly();
  if (actor && isPaidPlan(actor.plan, actor.expires_at)) redirect("/app");

  const { promo } = await searchParams;
  // El link del mail de descuento trae ?promo=SKILLIO25 → arranca aplicado.
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
      {/* Adelantar el handshake con los dominios del SDK/Brick de MP: recorta
          los segundos de espera al cargar el formulario de tarjeta. */}
      <link rel="preconnect" href="https://sdk.mercadopago.com" crossOrigin="" />
      <link rel="preconnect" href="https://api.mercadopago.com" crossOrigin="" />
      <link rel="preconnect" href="https://http2.mlstatic.com" crossOrigin="" />
      <link rel="dns-prefetch" href="https://sdk.mercadopago.com" />
      <PagarEmbeddedClient initialEmail={email} initialPromo={initialPromo} />
    </>
  );
}
