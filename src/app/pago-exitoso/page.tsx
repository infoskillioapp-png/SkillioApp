import { auth } from "@clerk/nextjs/server";
import { mpGetSubscription } from "@/lib/mercadopago";
import { ClerkUpgradeClient } from "./_components/clerk-upgrade-client";
import { AnonClaimClient } from "./_components/anon-claim-client";

// Vuelta del pago. Dos flujos:
//  - Usuario logueado (upgrade desde /app): confirma la suscripción y espera la
//    activación (ClerkUpgradeClient).
//  - Anónimo (registro diferido): confirma su mail → se crea la cuenta y se
//    reclama la sesión anónima → auto-login (AnonClaimClient).
export default async function PagoExitosoPage({
  searchParams,
}: {
  searchParams: Promise<{ preapproval_id?: string }>;
}) {
  const sp = await searchParams;
  const preapprovalId = sp.preapproval_id ?? null;

  const { userId } = await auth();
  if (userId) {
    return <ClerkUpgradeClient preapprovalId={preapprovalId} />;
  }

  // Prefill del mail con el que usó en MercadoPago (se confirma/corrige acá).
  let payerEmail = "";
  if (preapprovalId) {
    try {
      const sub = await mpGetSubscription(preapprovalId);
      payerEmail = sub.payer_email ?? "";
    } catch {
      /* si falla, arranca vacío */
    }
  }

  return <AnonClaimClient preapprovalId={preapprovalId} defaultEmail={payerEmail} />;
}
