"use client";

// Tracking de funnel desde el cliente. Manda el evento a /api/track (que lo
// resuelve contra la sesión de Clerk y lo guarda en funnel_events). Usa
// sendBeacon cuando está disponible para no perder eventos al navegar.
export function track(
  event: string,
  step?: string | null,
  meta?: Record<string, unknown>,
): void {
  try {
    const body = JSON.stringify({ event, step: step ?? null, meta: meta ?? null });
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {
    /* el tracking nunca rompe la UX */
  }
}

// Dispara un evento estándar del Pixel de Meta (si está cargado). Para que
// Facebook lea el comportamiento de compra con claridad (ViewContent,
// InitiateCheckout, etc.) además del CAPI server-side.
// eventId: mismo id que el evento server-side (CAPI) para que Meta no lo cuente doble.
export function pixel(event: string, params?: Record<string, unknown>, eventId?: string): void {
  withFbq((fbq) => {
    if (eventId) fbq("track", event, params ?? {}, { eventID: eventId });
    else fbq("track", event, params ?? {});
  });
}

// Evento PERSONALIZADO del Pixel (no estándar): CTA_Click, Upload_Panel_Open,
// File_Selected, Apunte_Subido, Activacion. eventId = mismo id que el CAPI.
export function pixelCustom(event: string, params?: Record<string, unknown>, eventId?: string): void {
  withFbq((fbq) => {
    if (eventId) fbq("trackCustom", event, params ?? {}, { eventID: eventId });
    else fbq("trackCustom", event, params ?? {});
  });
}

// El píxel de la app se carga DESPUÉS de que la página arranca (Script
// afterInteractive). Si un evento sale antes (ej.: el panel de subida se abre
// solo al entrar desde la landing), lo reintentamos hasta 5 s en vez de perderlo.
type Fbq = (...args: unknown[]) => void;
function withFbq(cb: (fbq: Fbq) => void, tries = 20): void {
  try {
    const fbq = (window as Window & { fbq?: Fbq }).fbq;
    if (typeof fbq === "function") { cb(fbq); return; }
    if (tries > 0) setTimeout(() => withFbq(cb, tries - 1), 250);
  } catch {
    /* el tracking nunca rompe la UX */
  }
}

// Qué botón de la landing trajo a la persona (lo guarda la landing estática en
// sessionStorage al tocar «Probalo gratis»). Se lee UNA vez, al abrir el panel.
export function consumeCtaOrigin(): string {
  try {
    const v = sessionStorage.getItem("skillio_cta");
    sessionStorage.removeItem("skillio_cta");
    return v || "app";
  } catch { return "app"; }
}

// Tipo de archivo en palabras simples (para el embudo y Meta).
export function fileKind(file: File): string {
  const n = file.name.toLowerCase(), t = file.type;
  if (t === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (t.startsWith("image/") || /\.(jpe?g|png|heic|webp)$/.test(n)) return "foto";
  if (t.startsWith("audio/") || /\.(mp3|wav|m4a)$/.test(n)) return "audio";
  if (n.endsWith(".doc") || n.endsWith(".docx")) return "word";
  if (n.endsWith(".ppt") || n.endsWith(".pptx")) return "ppt";
  if (n.endsWith(".txt")) return "texto";
  return "otro";
}

// InitiateCheckout se manda UNA vez por intento de compra: el paywall lo marca
// al tocar "Continuar"; el checkout solo lo manda si no vino marcado (ej. llegó
// desde el mail del descuento o un link directo).
const IC_KEY = "skillio_ic_sent";
export function markInitiateCheckout(): void {
  try { sessionStorage.setItem(IC_KEY, String(Date.now())); } catch { /* noop */ }
}
export function consumeInitiateCheckoutMark(): boolean {
  try {
    const v = sessionStorage.getItem(IC_KEY);
    sessionStorage.removeItem(IC_KEY);
    return !!v && Date.now() - Number(v) < 30 * 60 * 1000;
  } catch { return false; }
}
