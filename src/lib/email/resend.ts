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
      body: `Skillio convierte tus apuntes y PDFs en <b>resúmenes claros, flashcards y simulacros de parcial</b> en segundos.<br><br>Tenés tu <b>primera generación gratis</b> para empezar. El mejor primer paso: subí el apunte más denso que tengas.`,
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
    subject: "¿Ya probaste la IA? Tu generación gratis te espera 📚",
    html: wrap({
      preview: "Pegá un apunte y armá tu primer resumen, mazo o simulacro.",
      heading: `${n}, ¿ya generaste algo?`,
      body: `Tu <b>generación gratis</b> te está esperando.<br><br>Subí cualquier apunte y en segundos tenés un <b>resumen por puntos clave</b>, un <b>mazo de flashcards</b> y un <b>simulacro de parcial</b> listo para practicar.`,
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
      body: `Usaste tu generación gratis justo cuando le estabas agarrando la mano.<br><br>Con <b>Skillio PRO</b> seguís generando resúmenes, flashcards y simulacros <b>sin límites</b>.<br><br>
        <span style="background:#f3f0ff;border-radius:8px;padding:4px 10px;font-weight:700;color:#8b5cf6;">⚡ Semanal $4.900</span>&nbsp;&nbsp;
        <span style="background:#f3f0ff;border-radius:8px;padding:4px 10px;font-weight:700;color:#8b5cf6;">⭐ Mensual $15.900</span>`,
      ctaText: "Ver planes y seguir →",
      ctaPath: "/app",
    }),
  });
}

/**
 * Mail de rescate del embudo anónimo (registro diferido). Se dispara cuando el
 * usuario cierra el paywall sin pagar y deja su mail para "no perder" el
 * resultado. `resultPath` incluye el token de sesión anónima (?s=…) para que
 * pueda volver a su resultado desde cualquier dispositivo.
 */
export async function sendResultRescueEmail(to: string, resultPath: string): Promise<void> {
  await send({
    to,
    subject: "Tu resumen te está esperando 📚",
    html: wrap({
      preview: "Volvé cuando quieras: tu resumen quedó guardado.",
      heading: "Guardamos tu resumen 📚",
      body: `Generaste un resumen con Skillio y lo dejamos guardado para que no lo pierdas.<br><br>Volvé cuando quieras desde este link — te lleva directo a tu resultado, sin tener que subir el apunte de nuevo.<br><br>Cuando quieras el resumen completo (todos los temas desbloqueados), lo desbloqueás desde ahí mismo. 💜`,
      ctaText: "Volver a mi resumen →",
      ctaPath: resultPath,
    }),
  });
}

// ---------------------------------------------------------------------------
// Mails-regalo (captura de mail en el embudo anónimo). Todos entran por
// /api/public/gift. Enmarcados como REGALO, no como pedido de mail.
// ---------------------------------------------------------------------------

/** Regalo #1: lead magnet "10 técnicas de estudio con base científica". */
export async function sendTechniquesEmail(to: string): Promise<void> {
  const tecnicas: [string, string][] = [
    ["Recuerdo activo", "Cerrá el apunte y tratá de escribir o decir lo que recordás. Recuperar la info fija muchísimo más que releer."],
    ["Repetición espaciada", "Repasá en intervalos crecientes (1 día, 3 días, 1 semana). Le gana a estudiar todo junto la noche anterior."],
    ["Técnica Pomodoro", "25 minutos de foco total + 5 de descanso. Repetí. Evita el agotamiento y sube la concentración."],
    ["Efecto Feynman", "Explicá el tema en voz alta como si se lo enseñaras a alguien. Si te trabás, ahí está lo que no entendiste."],
    ["Intercalado", "Mezclá temas o materias en una misma sesión en vez de bloques largos de uno solo. Mejora la retención a largo plazo."],
    ["Practicá con exámenes", "Hacer simulacros es de lo más efectivo que existe: el propio test es estudio (testing effect)."],
    ["Dormí bien", "La memoria se consolida durmiendo. No sacrifiques el sueño la noche antes del parcial."],
    ["Cero multitarea", "Un solo tema a la vez y el celular lejos. Cambiar de tarea te cuesta minutos de foco cada vez."],
    ["Resumí con tus palabras", "Reescribir un tema con tus propias palabras supera por lejos a subrayar y releer."],
    ["Enseñá lo aprendido", "Contarle el tema a un compañero (o a Booki 😄) es la prueba final de que lo dominás."],
  ];
  const list = tecnicas
    .map(([t, d], i) => `<div style="margin:0 0 14px;"><b style="color:#2b2620;">${i + 1}. ${t}</b><br><span style="color:#5b5247;">${d}</span></div>`)
    .join("");
  await send({
    to,
    subject: "🎁 Tus 10 técnicas de estudio (con base científica)",
    html: wrap({
      preview: "Recuerdo activo, repetición espaciada, Feynman y 7 más. Tu regalo de Skillio.",
      heading: "🎁 Tus 10 técnicas de estudio",
      body: `Acá va tu regalo: las <b>10 técnicas de estudio más respaldadas por la ciencia</b>, para que rindas más en menos tiempo.<br><br>${list}<br>Lo mejor: con Skillio ya aplicás varias de estas (recuerdo activo, simulacros, resúmenes) en automático desde tus apuntes. 💜`,
      ctaText: "Probar Skillio gratis →",
      ctaPath: "/app?upload=1",
    }),
  });
}

/** Regalo #2: el PDF del resumen del free, listo para descargar (se lo mandamos por mail). */
export async function sendResumenLinkEmail(to: string, resultPath: string): Promise<void> {
  await send({
    to,
    subject: "🎁 Tu resumen de Skillio, listo para estudiar 📄",
    html: wrap({
      preview: "Tu PDF ya está listo. Tocá el botón para descargarlo.",
      heading: "🎁 Tu PDF está listo",
      body: `Te dejamos el botón para descargar tu resumen en PDF, desde cualquier dispositivo, cuando quieras.<br><br>Y si querés el resumen <b>completo</b> (todos los temas desbloqueados) + tarjetas y simulacro, lo desbloqueás con PRO. 💜`,
      ctaText: "Descargar mi PDF →",
      ctaPath: resultPath,
    }),
  });
}

/** Regalo #3: confirmación de la generación extra desbloqueada. */
export async function sendBonusGenerationEmail(to: string): Promise<void> {
  await send({
    to,
    subject: "🎁 Te regalamos 1 generación más 🎉",
    html: wrap({
      preview: "Desbloqueaste una generación extra en Skillio. A usarla.",
      heading: "🎁 ¡Generación extra desbloqueada!",
      body: `Gracias por dejarnos tu mail. Te regalamos <b>1 generación más</b> — ya está lista en tu cuenta.<br><br>Subí otro apunte y armá tu resumen, tarjetas y simulacro. Cuando quieras generar sin límites, PRO te espera. 💜`,
      ctaText: "Usar mi generación →",
      ctaPath: "/app?upload=1",
    }),
  });
}

/** Regalo #4: código de descuento para el lead caliente que cerró el paywall. */
export async function sendDiscountEmail(to: string, code: string, pct: number): Promise<void> {
  await send({
    to,
    subject: `🎁 Tu ${pct}% OFF te está esperando (código adentro)`,
    html: wrap({
      preview: `Usá el código ${code} y arrancá con ${pct}% de descuento.`,
      heading: `🎁 ${pct}% OFF, de regalo`,
      body: `Como te lo prometimos, acá está tu código de descuento:<br><br>
        <div style="text-align:center;margin:8px 0 4px;"><span style="display:inline-block;background:#f3f0ff;border:2px dashed #8b5cf6;border-radius:12px;padding:12px 24px;font-size:22px;font-weight:800;letter-spacing:2px;color:#6d28d9;">${code}</span></div>
        <div style="text-align:center;color:#9a8f80;font-size:12px;margin-bottom:16px;">${pct}% OFF en tu primer pago</div>
        Con <b>Skillio PRO</b> generás sin límites, con el mejor modelo de IA.<br><br>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
          <tr>
            <td style="background:#f8f7ff;border:1.5px solid #e0d9ff;border-radius:12px;padding:12px 16px;width:48%;">
              <div style="font-weight:700;font-size:13px;color:#4f7dff;">⚡ Semanal</div>
              <div style="font-size:13px;color:#9a8f80;text-decoration:line-through;">$4.900</div>
              <div style="font-size:20px;font-weight:800;color:#2b2620;">$3.675</div>
            </td>
            <td style="width:4%;"></td>
            <td style="background:linear-gradient(135deg,#f3f0ff,#eef2ff);border:1.5px solid #c4b5fd;border-radius:12px;padding:12px 16px;width:48%;">
              <div style="font-weight:700;font-size:13px;color:#8b5cf6;">⭐ Mensual PRO</div>
              <div style="font-size:13px;color:#9a8f80;text-decoration:line-through;">$15.900</div>
              <div style="font-size:20px;font-weight:800;color:#2b2620;">$11.925</div>
            </td>
          </tr>
        </table>
        <div style="color:#9a8f80;font-size:12px;">⏳ Válido por 48 horas.</div>`,
      ctaText: "Activar mi descuento →",
      // Directo al paywall con el plan Mensual preseleccionado (no a la home
      // genérica, que puede abrir otros modales encima).
      ctaPath: "/app?upgrade=mensual",
    }),
  });
}
