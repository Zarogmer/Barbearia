import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  images: {
    // Vitrine PBI-26: dono cola URL de Cloudinary/Imgur/CDN próprio.
    // Sem upload nesta fase — aceita qualquer host HTTPS.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

// PBI-53: wrap Sentry. SENTRY_DSN ausente = build segue normal (config
// continua rodando, mas init() no-op).
export default withSentryConfig(nextConfig, {
  // Org/project só são necessários pra source maps upload no CI. Em dev
  // ficam vazios — o build funciona, só não tem source maps em produção.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI, // logs verbosos só no CI
  widenClientFileUpload: true,
  // Túnel das requests do client pra contornar adblock — usa rota interna
  // em vez de bater direto no domínio do Sentry.
  tunnelRoute: "/monitoring",
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
