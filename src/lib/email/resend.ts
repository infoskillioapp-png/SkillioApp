import "server-only";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { buildUnsubscribeUrl } from "./unsubscribe";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const FROM = process.env.RESEND_FROM ?? "Skillio <hola@skillio.digital>";
const REPLY_TO = "info.skillioapp@gmail.com";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://skillio.digital").replace(/\/$/, "");

const UNSUBSCRIBE_MAILTO = `<mailto:${REPLY_TO}?subject=${encodeURIComponent("Baja Skillio")}>`;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] || "estudiante";
}

// ---------------------------------------------------------------------------
// Layout HTML compartido (estilo Skillio, inline para clientes de mail)
// ---------------------------------------------------------------------------
function wrap(opts: {
  preview: string;
  heading: string;
  body: string;
  ctaText: string;
  ctaPath: string;
}): string {
  const url = `${APP_URL}${opts.ctaPath}`;
  return `<!DOCTYPE html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4efe9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2620;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preview}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e7ded2;">
        <tr><td style="padding:28px 32px 8px;">
          <div style="font-weight:800;font-size:22px;letter-spacing:-0.02em;">Skill<span style="color:#a5402d;">io</span></div>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;letter-spacing:-0.02em;color:#2b2620;">${opts.heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#5b5247;">${opts.body}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <a href="${url}" style="display:inline-block;background:#a5402d;color:#fbf1ef;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:999px;">${opts.ctaText}</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <div style="border-top:1px solid #efe8df;padding-top:16px;font-size:12px;color:#9a8f80;line-height:1.5;">
            Skillio · Tu copiloto de estudio 🇦🇷<br>
            ¿No querés más estos correos? <a href="__UNSUB_URL__" style="color:#9a8f80;text-decoration:underline;">Cancelar suscripción</a>.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function isOptedOut(email: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin()
      .from("users")
      .select("email_opt_out")
      .eq("email", email)
      .maybeSingle();
    return Boolean(data?.email_opt_out);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Envío base (nunca lanza)
// ---------------------------------------------------------------------------
async function send(opts: {
  to: string;
  subject: string;
  html: string;
  scheduledAt?: string;
}): Promise<void> {
  const resend = client();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY no configurada — mail no enviado:", opts.subject);
    return;
  }

  if (await isOptedOut(opts.to)) {
    console.log("[email] baja activa, no se envía:", opts.to, "·", opts.subject);
    return;
  }

  const unsubUrl = buildUnsubscribeUrl(APP_URL, opts.to);
  const html = opts.html.replaceAll("__UNSUB_URL__", unsubUrl);

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      replyTo: REPLY_TO,
      subject: opts.subject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>, ${UNSUBSCRIBE_MAILTO}`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      ...(opts.scheduledAt ? { scheduledAt: opts.scheduledAt } : {}),
    });
    if (error) console.error("[email] Resend error:", error, "·", opts.subject);
  } catch (e) {
    console.error("[email] envío falló:", e, "·", opts.subject);
  }
}

// ---------------------------------------------------------------------------
// Secuencia de nurture
// ---------------------------------------------------------------------------

/**
 * Mail 1 — inmediato al registrarse.
 * Objetivo: que suban su primer apunte y disparen la primera generación gratis.
 */
export async function sendWelcomeEmail(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);
  await send({
    to,
    subject: `${n}, tu IA de estudio te está esperando 🎉`,
    html: wrap({
      preview: "Subí un apunte y en segundos tenés resumen, tarjetas y simulacro.",
      heading: `¡Hola ${n}! Ya estás dentro 🎉`,
      body: `Skillio convierte tus apuntes y PDFs en <b>resúmenes claros, flashcards y simulacros de parcial</b> en segundos.<br><br>Tenés <b>3 generaciones gratis</b> para empezar. El mejor primer paso: subí el apunte más denso que tengas.`,
      ctaText: "Subir mi primer apunte →",
      ctaPath: "/app?upload=1",
    }),
  });
}

/**
 * Programa los mails de nurture post-registro.
 * Mail 2 (+2h): recordatorio para el que no generó todavía.
 * Mail 3 (+20h): upsell con los planes disponibles.
 */
export async function scheduleNudgeEmails(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);

  const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const in20h = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();

  // Mail 2 · +2h — empuje para el que no entró todavía
  await send({
    to,
    scheduledAt: in2h,
    subject: "¿Ya probaste la IA? Tenés 3 generaciones gratis 📚",
    html: wrap({
      preview: "Pegá un apunte y armá tu primer resumen, mazo o simulacro.",
      heading: `${n}, ¿ya generaste algo?`,
      body: `Tus <b>3 generaciones gratis</b> te están esperando.<br><br>Subí cualquier apunte y en segundos tenés un <b>resumen por puntos clave</b>, un <b>mazo de flashcards</b> o un <b>simulacro de parcial</b> listo para practicar.`,
      ctaText: "Generar ahora →",
      ctaPath: "/app?upload=1",
    }),
  });

  // Mail 3 · +20h — upsell con precios reales
  await send({
    to,
    scheduledAt: in20h,
    subject: "Antes de tu próximo parcial, una ventaja 🚀",
    html: wrap({
      preview: "Estudiá sin límites con Skillio PRO. Desde $4.900/semana.",
      heading: `${n}, llevá tu estudio al siguiente nivel`,
      body: `Con <b>Skillio PRO</b> generás resúmenes, flashcards y simulacros <b>sin límites</b>, con el modelo de IA más potente.<br><br>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
          <tr>
            <td style="background:#f8f7ff;border:1.5px solid #e0d9ff;border-radius:12px;padding:14px 18px;width:48%;">
              <div style="font-weight:700;font-size:14px;color:#4f7dff;">⚡ Semanal</div>
              <div style="font-size:22px;font-weight:800;color:#2b2620;margin:4px 0;">$4.900</div>
              <div style="font-size:12px;color:#9a8f80;">Ideal para el parcial de esta semana</div>
            </td>
            <td style="width:4%;"></td>
            <td style="background:linear-gradient(135deg,#f3f0ff,#eef2ff);border:1.5px solid #c4b5fd;border-radius:12px;padding:14px 18px;width:48%;">
              <div style="font-weight:700;font-size:14px;color:#8b5cf6;">⭐ Mensual PRO</div>
              <div style="font-size:22px;font-weight:800;color:#2b2620;margin:4px 0;">$15.900</div>
              <div style="font-size:12px;color:#9a8f80;">Mejor valor · ~$530/día</div>
            </td>
          </tr>
        </table>`,
      ctaText: "Ver planes →",
      ctaPath: "/app",
    }),
  });
}

/**
 * Mail de créditos agotados — se dispara cuando el free usa su última generación.
 * Objetivo: convertir en caliente, justo cuando el dolor es máximo.
 */
export async function sendCreditsExhaustedEmail(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);
  await send({
    to,
    subject: "Se te acabaron las generaciones gratis 🔥",
    html: wrap({
      preview: "Justo cuando le estabas agarrando la mano. Seguí sin límites con PRO.",
      heading: `${n}, te quedaste sin generaciones en plena racha 🔥`,
      body: `Usaste tus 3 generaciones gratis justo cuando le estabas agarrando la mano.<br><br>Con <b>Skillio PRO</b> seguís generando resúmenes, flashcards y simulacros <b>sin límites</b>.<br><br>
        <span style="background:#f3f0ff;border-radius:8px;padding:4px 10px;font-weight:700;color:#8b5cf6;">⚡ Semanal $4.900</span>&nbsp;&nbsp;
        <span style="background:#f3f0ff;border-radius:8px;padding:4px 10px;font-weight:700;color:#8b5cf6;">⭐ Mensual $15.900</span>`,
      ctaText: "Ver planes y seguir →",
      ctaPath: "/app",
    }),
  });
}
