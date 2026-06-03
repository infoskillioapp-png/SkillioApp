import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "./_components/landing/landing";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ preapproval_id?: string }>;
}) {
  const sp = await searchParams;

  // MercadoPago redirige el back_url de la suscripción a la raíz del dominio
  // (MP solo acepta el dominio sin path en el back_url del plan). Reenviamos a
  // /pago-exitoso para que corra la confirmación del pago — ANTES del redirect
  // a /app, porque el usuario vuelve logueado.
  if (sp.preapproval_id) {
    redirect(`/pago-exitoso?preapproval_id=${encodeURIComponent(sp.preapproval_id)}`);
  }

  const { userId } = await auth();
  if (userId) redirect("/app");
  return <LandingPage />;
}
