/**
 * Entry point pro Sentry. Next.js chama `register()` uma vez por runtime
 * (node/edge). Importamos o config correspondente, que executa Sentry.init().
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// captureRequestError é o nome correto na API atual (10.x+).
export const onRequestError = Sentry.captureRequestError;
