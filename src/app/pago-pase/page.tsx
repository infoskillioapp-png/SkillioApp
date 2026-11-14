import { PagoPaseClient } from "./pago-pase-client";

// Vuelta de Mercado Pago tras pagar el Pase con dinero en cuenta. MP agrega
// ?payment_id=… (o collection_id) a la URL.
export default async function PagoPasePage({
  searchParams,
}: {
  searchParams: Promise<{ payment_id?: string; collection_id?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const paymentId = sp.payment_id ?? sp.collection_id ?? "";
  return <PagoPaseClient paymentId={paymentId} />;
}
