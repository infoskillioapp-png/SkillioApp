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
  // Identidad Skillio actual: violeta (#7c3aed / #8b5cf6). Todos los mails
  // pasan por acá, así que este template define el look de la marca en el mail.
  return `<!DOCTYPE html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#f4f2fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2347;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preview}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2fb;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ece7fb;box-shadow:0 12px 36px rgba(124,58,237,.10);">
        <tr><td style="height:5px;background:linear-gradient(90deg,#6d3bf2,#9326cf,#c1338f);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:26px 32px 6px;">
          <div style="font-weight:800;font-size:22px;letter-spacing:-0.02em;color:#1f2347;">Skill<span style="color:#7c3aed;">io</span></div>
        </td></tr>
        <tr><td style="padding:8px 32px 4px;">
          <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25;letter-spacing:-0.02em;color:#1f2347;">${opts.heading}</h1>
          <div style="font-size:15px;line-height:1.6;color:#5b6178;">${opts.body}</div>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <a href="${url}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:14px;">${opts.ctaText}</a>
        </td></tr>
        <tr><td style="padding:0 32px 28px;">
          <div style="border-top:1px solid #f0ecfb;padding-top:16px;font-size:12px;color:#9aa0b8;line-height:1.5;">
            Skillio · Tu copiloto de estudio 🇦🇷<br>
            ¿No querés más estos correos? <a href="__UNSUB_URL__" style="color:#9aa0b8;text-decoration:underline;">Cancelar suscripción</a>.
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
// NOTA: los mails de marketing/nurture del free (bienvenida, nudges +2h/+20h,
// créditos agotados) se retiraron — el email marketing se rearma desde cero.
// Abajo quedan los mails de CAPTURA (rescate + regalos) y el transaccional PRO.
// ---------------------------------------------------------------------------

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
    .map(([t, d], i) => `<div style="margin:0 0 14px;"><b style="color:#1f2347;">${i + 1}. ${t}</b><br><span style="color:#5b6178;">${d}</span></div>`)
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
        <div style="text-align:center;color:#9aa0b8;font-size:12px;margin-bottom:16px;">${pct}% OFF en tu primer mes del plan Mensual PRO</div>
        Con <b>Skillio PRO</b> generás sin límites, con el mejor modelo de IA.<br><br>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
          <tr>
            <td style="background:linear-gradient(135deg,#f3f0ff,#eef2ff);border:1.5px solid #c4b5fd;border-radius:12px;padding:14px 18px;">
              <div style="font-weight:700;font-size:14px;color:#8b5cf6;">⭐ Mensual PRO</div>
              <div style="margin-top:4px;"><span style="font-size:14px;color:#9aa0b8;text-decoration:line-through;">$15.900</span> &nbsp;<span style="font-size:22px;font-weight:800;color:#1f2347;">$11.925</span> <span style="font-size:12px;color:#8b5cf6;font-weight:700;">primer mes</span></div>
              <div style="font-size:12px;color:#9aa0b8;margin-top:4px;">Después se renueva a $15.900/mes. Cancelás cuando quieras.</div>
            </td>
          </tr>
        </table>
        <div style="color:#9aa0b8;font-size:12px;">⏳ Válido por 48 horas.</div>`,
      ctaText: "Activar mi descuento →",
      // Directo al checkout embebido con el código ya aplicado (25% OFF primer mes).
      ctaPath: `/pagar?promo=${code}`,
    }),
  });
}

// ---------------------------------------------------------------------------
// Transaccional: bienvenida PRO (tras un pago exitoso en el checkout embebido)
// ---------------------------------------------------------------------------

/** Se dispara al activar el plan pago: confirma la suscripción y explica el acceso. */
export async function sendProWelcomeEmail(to: string, name?: string | null): Promise<void> {
  const n = firstName(name);
  await send({
    to,
    subject: "🎉 ¡Ya sos PRO! Tu suscripción está activa",
    html: wrap({
      preview: "Tu pago se acreditó. Ya tenés todo Skillio sin límites.",
      heading: `¡Bienvenido a PRO, ${n}! 🎉`,
      body: `Tu pago se acreditó y tu <b>suscripción Mensual PRO</b> ya está activa. Desde ahora tenés:<br><br>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:14px;color:#3b3558;">✅ Resúmenes, tarjetas, simulacros y juegos sin límites</td></tr>
          <tr><td style="padding:3px 0;font-size:14px;color:#3b3558;">✅ El modelo de IA de máxima calidad en tus resúmenes</td></tr>
          <tr><td style="padding:3px 0;font-size:14px;color:#3b3558;">✅ Acceso completo a todos tus apuntes, sin cortes</td></tr>
        </table><br>
        <b>¿Cómo entrás?</b> Sin contraseña: cada vez que quieras ingresar te mandamos un código a este mail.<br><br>
        Se renueva automáticamente cada mes ($15.900). Podés cancelar cuando quieras desde tu perfil.<br><br>
        ¿Alguna duda? Respondé este mail y te ayudamos — <b>soporte 24/7</b>. 💜`,
      ctaText: "Entrar a estudiar →",
      ctaPath: "/app",
    }),
  });
}
