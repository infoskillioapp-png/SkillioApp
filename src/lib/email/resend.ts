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

// List-Unsubscribe: requisito anti-spam de Gmail/Yahoo para remitentes masivos.
// Fase 1: baja por mail (al mismo buzón real del reply-to). El one-click HTTPS
// (List-Unsubscribe-Post) se agrega en fase 2 con un endpoint /api/unsubscribe.
const UNSUBSCRIBE_MAILTO = `<mailto:${REPLY_TO}?subject=${encodeURIComponent("Baja Skillio")}>`;

// Cliente perezoso: si no hay API key (ej. local sin configurar), devolvemos
// null y los envíos se vuelven no-op (no rompen el flujo principal).
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
  body: string; // HTML del cuerpo
  ctaText: string;
  ctaPath: string; // ej "/app" o "/pagar"
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

// ¿El usuario se dio de baja? Ante error de DB no bloqueamos (devolvemos false).
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
// Envío base (nunca lanza: loguea y sigue)
// ---------------------------------------------------------------------------
async function send(opts: {
  to: string;
  subject: string;
  html: string;
  scheduledAt?: string; // ISO 8601 o lenguaje natural ("in 2 hours")
}): Promise<void> {
  const resend = client();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY no configurada — mail no enviado:", opts.subject);
    return;
  }

  // Respetar la baja. (En los mails programados a +2h/+20h, el chequeo corre al
  // programar; una baja posterior no cancela el envío ya en cola en Resend.)
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
// Secuencia de nurture (4 mails)
// ---------------------------------------------------------------------------

/** Mail 1 — inmediato al completar el registro. */
export async function sendWelcomeEmail(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);
  await send({
    to,
    subject: "¡Bienvenido a Skillio! 🎉 Tu primer resumen te espera",
    html: wrap({
      preview: "Subí un apunte y dejá que la IA lo resuma en segundos.",
      heading: `¡Hola ${n}! Ya estás dentro 🎉`,
      body: `Skillio convierte tus apuntes, PDFs y fotos en <b>resúmenes, flashcards y simulacros</b> en segundos.<br><br>El mejor primer paso: subí tu apunte más denso y mirá lo que hace la IA.`,
      ctaText: "Subir mi primer apunte →",
      ctaPath: "/app/apuntes",
    }),
  });
}

/** Mail 2 — programado a +2h del registro. */
export async function scheduleNudgeEmails(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);

  const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const in20h = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();

  // Mail 2 · +2h
  await send({
    to,
    scheduledAt: in2h,
    subject: "¿Tenés un parcial cerca? 📚",
    html: wrap({
      preview: "Pegá un apunte y armá tu primer simulacro.",
      heading: `${n}, ¿ya probaste la IA?`,
      body: `Subí cualquier apunte y en segundos tenés un <b>resumen claro</b>, un <b>mazo de flashcards</b> o un <b>simulacro de parcial</b>.<br><br>Es la forma más rápida de empezar a estudiar de verdad.`,
      ctaText: "Probar ahora →",
      ctaPath: "/app/ia",
    }),
  });

  // Mail 4 · hora 20 desde el registro
  await send({
    to,
    scheduledAt: in20h,
    subject: "Tu próximo parcial te lo agradece 🚀",
    html: wrap({
      preview: "Estudiá sin límites con Skillio PRO.",
      heading: `${n}, llevá tu estudio al siguiente nivel`,
      body: `Con <b>Skillio PRO</b> generás resúmenes, flashcards y simulacros <b>sin límites</b>, con el modelo de IA más potente.<br><br>Un solo plan, todo desbloqueado.`,
      ctaText: "Pasate a PRO →",
      ctaPath: "/pagar",
    }),
  });
}

/**
 * Mail de handoff a la compu — inmediato al terminar el demo guiado.
 * El demo se vive en el celu, pero el fuerte de la app es la compu: este mail
 * (+ el subtítulo del paso 3) convierte el "andá a la PC" en algo que de verdad
 * pasa, con un link directo de un toque.
 */
export async function sendContinueOnComputerEmail(
  to: string,
  name?: string | null,
): Promise<void> {
  const n = firstName(name);
  await send({
    to,
    subject: "Seguí en tu compu 💻 (tus apuntes rinden más en pantalla grande)",
    html: wrap({
      preview: "Un toque y seguís estudiando con Skillio en tu computadora.",
      heading: `${n}, ¡así de fácil es aprobar con Skillio! 🎉`,
      body: `Ya viste lo que la IA hace con un apunte. Ahora probá con los <b>tuyos</b>: sacale una foto, escribí un tema o subí el PDF y obtené resúmenes y simulacros en segundos.<br><br>📲 Lo armaste desde el celu, pero <b>en la compu rinde el doble</b>: pantalla grande para leer y estudiar cómodo. Entrá desde acá 👇`,
      ctaText: "Seguir en mi compu →",
      ctaPath: "/app/ia",
    }),
  });
}

/** Mail 3 — inmediato cuando el free agota sus 3 generaciones. */
export async function sendCreditsExhaustedEmail(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);
  await send({
    to,
    subject: "Se te acabaron los créditos 🔥 seguí con PRO",
    html: wrap({
      preview: "Justo cuando estabas en racha. Seguí sin límites con PRO.",
      heading: `${n}, se te acabaron los créditos en plena racha 🔥`,
      body: `Te quedaste sin generaciones gratis justo cuando le estabas agarrando la mano.<br><br>Con <b>Skillio PRO</b> seguís generando resúmenes, flashcards y simulacros <b>sin límites</b>. Un solo plan, todo desbloqueado.`,
      ctaText: "Pasate a PRO y seguí →",
      ctaPath: "/pagar",
    }),
  });
}
