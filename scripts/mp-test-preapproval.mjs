#!/usr/bin/env node
// Diagnóstico: prueba POST /preapproval contra MP con distintos back_url para
// ver EXACTAMENTE qué acepta. Sin card_token (status pending) → no crea nada
// cobrable; solo dispara la validación de campos de MP.
import { readFile } from "node:fs/promises";

const env = await readFile(".env.local", "utf8").catch(() => "");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "").trim();
}

const token = process.env.MP_ACCESS_TOKEN;
if (!token) { console.error("falta MP_ACCESS_TOKEN"); process.exit(2); }

const backUrls = [
  "https://skillio.digital",
  "https://skillio.digital/",
  "https://skillio.digital/app",
  "https://www.mercadopago.com.ar",
  "https://www.mercadopago.com.ar/checkout",
];

for (const backUrl of backUrls) {
  const body = {
    reason: "Plan Mensual Skillio",
    external_reference: "diagnostico-test",
    payer_email: "test_user_diagnostico@testuser.com",
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 15900,
      currency_id: "ARS",
    },
    back_url: backUrl,
    status: "pending",
  };
  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n=== back_url: ${backUrl} → HTTP ${res.status} ===`);
  console.log(text.slice(0, 600));
}
