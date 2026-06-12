import "server-only";
import { createHash } from "crypto";

// Conversions API de Meta: manda el evento de compra desde el servidor (más
// confiable que el píxel del navegador, que pierde eventos por iOS/bloqueadores
// y encima acá la plata entra 24h después, sin navegador presente).
//
// El Pixel ID es público (ya está en el layout). El token es secreto y va por
// env (META_CAPI_TOKEN) — nunca en el front ni en git.
const PIXEL_ID = process.env.META_PIXEL_ID ?? "1331882875540046";
const API_VERSION = "v21.0";

// Meta exige email/teléfono hasheados en SHA-256, minúsculas y sin espacios.
function sha256(v: string): string {
  return createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
}

type PurchaseInput = {
  email: string;
  /** Teléfono en formato E.164 sin '+' (con código de país) si lo tenés. */
  phone?: string | null;
  value: number;
  currency?: string;
  /** Mismo id que el píxel (si hubiera) y estable para idempotencia. */
  eventId: string;
};

/**
 * Envía un evento Purchase a Meta por CAPI. Nunca lanza: loguea y sigue (no
 * queremos que un fallo de Meta rompa el webhook de cobro).
 */
export async function sendMetaPurchase(input: PurchaseInput): Promise<void> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) {
    console.warn("[meta-capi] META_CAPI_TOKEN no configurado — evento no enviado");
    return;
  }

  const userData: Record<string, unknown> = { em: [sha256(input.email)] };
  const phoneDigits = input.phone ? input.phone.replace(/\D/g, "") : "";
  if (phoneDigits) userData.ph = [sha256(phoneDigits)];

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: input.eventId, // dedup + idempotencia ante reintentos del webhook
        user_data: userData,
        custom_data: {
          currency: input.currency ?? "ARS",
          value: String(input.value),
        },
      },
    ],
    // Para probar sin que cuente: setear META_CAPI_TEST_CODE temporalmente.
    ...(process.env.META_CAPI_TEST_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_CODE }
      : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const text = await res.text();
    if (!res.ok) {
      console.error("[meta-capi] error", res.status, text);
    } else {
      console.log("[meta-capi] Purchase OK", input.eventId, text);
    }
  } catch (e) {
    console.error("[meta-capi] fetch falló:", e);
  }
}
