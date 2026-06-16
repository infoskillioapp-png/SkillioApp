import * as Sentry from "@sentry/nextjs";

// Next 16 (>=15.3) carga la instrumentación del cliente desde este archivo
// (reemplaza al viejo sentry.client.config.ts). Inicializa Sentry en el browser:
// errores del frontend + session replay ante errores.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});

// Instrumenta las navegaciones del App Router (lo pide el SDK de Sentry v10).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
