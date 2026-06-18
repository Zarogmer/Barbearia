import "server-only";

import * as Sentry from "@sentry/nextjs";

/**
 * Aplica tags de tenant e user no scope atual do Sentry. Chamado pelo
 * admin layout em todo request — assim qualquer erro capturado no resto
 * do handler vem etiquetado com a org/usuário, viabilizando filtro no
 * dashboard ("erros da org X esta semana").
 */
export function setSentryUserContext(input: {
  userId?: string;
  email?: string;
  orgId?: string;
  orgSlug?: string;
}): void {
  Sentry.setUser(
    input.userId
      ? { id: input.userId, email: input.email ?? undefined }
      : null,
  );
  if (input.orgId) Sentry.setTag("organizationId", input.orgId);
  if (input.orgSlug) Sentry.setTag("orgSlug", input.orgSlug);
}

/** Reset entre requests pra evitar leak entre tenants em runtimes serverless. */
export function clearSentryUserContext(): void {
  Sentry.setUser(null);
}
