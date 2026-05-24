"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Error boundary global — captura erros não tratados em qualquer route.
 * Mostra mensagem amigável em PT-BR sem stack trace pro usuário final.
 * Stack vai pra console em dev (Next.js já injeta) e pro logger em prod.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12 text-center sm:max-w-lg">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h1 className="mb-2 font-display text-2xl font-extrabold tracking-tight">
        Algo deu errado
      </h1>
      <p className="mb-7 max-w-xs text-sm text-subtle">
        Não foi possível processar essa página. Tente novamente em alguns
        instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      >
        <RefreshCw className="h-4 w-4" />
        Tentar de novo
      </button>
      {error.digest && (
        <p className="mt-6 mono text-[10px] uppercase tracking-wider text-subtle">
          ref: {error.digest}
        </p>
      )}
    </main>
  );
}
