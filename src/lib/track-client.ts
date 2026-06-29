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
export function pixel(event: string, params?: Record<string, unknown>): void {
  try {
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === "function") fbq("track", event, params ?? {});
  } catch {
    /* noop */
  }
}
