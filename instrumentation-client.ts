/**
 * Sentry init no client. Next.js carrega este arquivo automaticamente
 * em todo bundle de browser (a partir do Next 15.3 / Sentry 8.51).
 *
 * Em dev: ignora SENTRY_DSN ausente. Em produção, sem DSN o Sentry
 * fica silenciosamente off — não crasha.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  // Performance: 5% em produção, off em dev.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  // Session Replay desligado por padrão pra não passar do free tier do
  // Sentry. Ligar manualmente em pages especificas se precisar debug.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
  ignoreErrors: [
    // Browser noise comum
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Next.js internal flow
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
  ],
});

// Sentry SDK precisa desse handler exportado pro Next router transitions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
