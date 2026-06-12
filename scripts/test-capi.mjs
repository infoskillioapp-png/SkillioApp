// Prueba el CAPI sin un pago real. Manda un evento Purchase de TEST que aparece
// en Meta Events Manager → pestaña "Probar eventos".
//
// Uso (desde la raíz del proyecto, con META_CAPI_TOKEN en el entorno):
//   node scripts/test-capi.mjs TESTXXXXX
// donde TESTXXXXX es el "test_event_code" que te da Events Manager > Probar eventos.
import { createHash } from "crypto";

const PIXEL_ID = process.env.META_PIXEL_ID || "1331882875540046";
const TOKEN = process.env.META_CAPI_TOKEN;
const API_VERSION = "v21.0";
const testCode = process.argv[2];

if (!TOKEN) {
  console.error("Falta META_CAPI_TOKEN en el entorno.");
  process.exit(1);
}
if (!testCode) {
  console.error('Falta el test_event_code. Uso: node scripts/test-capi.mjs TESTXXXXX');
  process.exit(1);
}

const sha256 = (v) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

const payload = {
  data: [
    {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      action_source: "website",
      event_id: `test_${Date.now()}`,
      user_data: { em: [sha256("test@skillio.digital")] },
      custom_data: { currency: "ARS", value: "16000" },
    },
  ],
  test_event_code: testCode,
};

const res = await fetch(
  `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
);

console.log("HTTP", res.status);
console.log(await res.text());
