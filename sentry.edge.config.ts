/**
 * Sentry config — edge runtime (middleware + edge route handlers).
 * Configurado igual ao server pra simplificar; o subset disponível
 * em edge é menor, mas o SDK lida com isso internamente.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE ?? undefined,
  ignoreErrors: ["NEXT_REDIRECT", "NEXT_NOT_FOUND"],
});
