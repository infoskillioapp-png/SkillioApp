import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // @react-pdf/renderer (usado en /api/ai/resumen-pdf) trae deps que no se
  // empaquetan bien con el bundler del server — se cargan como externas.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default withSentryConfig(nextConfig, {
  org: "skillio-3o",
  project: "javascript-nextjs",
  silent: true,
  telemetry: false,
});
