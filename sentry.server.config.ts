/**
 * Sentry config — servidor (Node runtime: route handlers, server actions, etc.)
 *
 * PBI-53. Capturado: erros de Server Actions, route handlers, Server
 * Components. Tags `orgSlug` e `userId` aplicadas via `setSentryContext`
 * em src/lib/server/sentry.ts (chamado no admin layout).
 *
 * Sem SENTRY_DSN setado, init() é no-op — Sentry simplesmente não inicializa
 * e nada vai pro provedor. Útil em dev.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  // Traces: sample baixo em prod, off em dev. Em produção 5% já dá uma
  // ideia razoável de performance sem estourar budget do free tier.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
  // Em produção respeita NODE_ENV; em outros (preview, staging) marca explicito.
  environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE ?? undefined,
  ignoreErrors: [
    // Next.js usa exceptions pra controlar fluxo de redirect/notFound.
    // Capturar isso polui o Sentry sem agregar nada.
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    // Server Action cancelada pelo cliente (refresh, navegação): ruído.
    "AbortError",
  ],
  beforeSend(event, hint) {
    // Defesa extra: alguns erros chegam como objetos com .digest em vez do
    // nome no message — filtra esses também.
    const err = hint?.originalException;
    if (err && typeof err === "object") {
      const digest = (err as { digest?: string }).digest;
      if (digest === "NEXT_REDIRECT" || digest === "NEXT_NOT_FOUND") return null;
    }
    return event;
  },
});
