import * as Sentry from "@sentry/nextjs";

// Next 16 + Sentry v10: la inicialización de server/edge se carga desde acá.
// Sin este archivo, Sentry NO captura los errores del servidor (rutas, server
// components, server actions).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captura los errores que Next ve en el servidor (App Router) y los manda a Sentry.
export const onRequestError = Sentry.captureRequestError;
