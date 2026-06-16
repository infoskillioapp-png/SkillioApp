import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  org: "skillio-3o",
  project: "javascript-nextjs",
  silent: true,
  telemetry: false,
});
