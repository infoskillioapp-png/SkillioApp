#!/usr/bin/env node
/**
 * Envío de prueba con Resend. Lee RESEND_API_KEY y RESEND_FROM de .env.local.
 * Uso: node scripts/test-email.mjs [destino@mail.com]
 */
import { readFile } from "node:fs/promises";
import { Resend } from "resend";

const env = await readFile(".env.local", "utf8").catch(() => "");
function get(k) {
  const m = env.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : undefined;
}

const key = get("RESEND_API_KEY");
const from = get("RESEND_FROM") ?? "Skillio <hola@skillio.digital>";
const to = process.argv[2] ?? "info.skillioapp@gmail.com";

if (!key) {
  console.error("Falta RESEND_API_KEY en .env.local");
  process.exit(1);
}

const resend = new Resend(key);

const html = `<!DOCTYPE html><html lang="es-AR"><body style="margin:0;background:#f4efe9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#2b2620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#fff;border-radius:18px;border:1px solid #e7ded2;">
<tr><td style="padding:28px 32px 8px;"><div style="font-weight:800;font-size:22px;letter-spacing:-0.02em;">Skill<span style="color:#a5402d;">io</span></div></td></tr>
<tr><td style="padding:8px 32px 4px;"><h1 style="margin:0 0 12px;font-size:22px;color:#2b2620;">Prueba de envío ✅</h1>
<div style="font-size:15px;line-height:1.6;color:#5b5247;">Si estás leyendo esto, Resend, el dominio y el remitente <b>${from}</b> están funcionando. La secuencia de nurture (bienvenida, +2h, créditos agotados, hora 20) ya puede salir.</div></td></tr>
<tr><td style="padding:24px 32px 32px;"><a href="https://skillio.digital/app" style="display:inline-block;background:#a5402d;color:#fbf1ef;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">Ir a Skillio →</a></td></tr>
</table></td></tr></table></body></html>`;

const { data, error } = await resend.emails.send({
  from,
  to,
  replyTo: "info.skillioapp@gmail.com",
  subject: "Prueba Skillio · Resend ✅",
  html,
});

if (error) {
  console.error("ERROR:", JSON.stringify(error, null, 2));
  process.exit(1);
}
console.log("OK · enviado a", to, "· id:", data?.id, "· from:", from);
