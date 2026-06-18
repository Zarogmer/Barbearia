"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Smartphone } from "lucide-react";

import { cn } from "@/lib/utils";

import { createOrgInstanceAction } from "./actions";

export function CreateInstancePanel({ orgSlug }: { orgSlug: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const r = await createOrgInstanceAction();
      if (!r.ok) {
        setError(r.error);
      }
      // Sucesso: action faz revalidatePath, page recarrega e cai no flow
      // normal (ConnectionPanel com QR).
    });
  }

  return (
    <div className="space-y-5 rounded-md border border-line bg-surface p-6">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-2 rounded-md bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
          <Smartphone className="h-3 w-3" />
          Conectar WhatsApp
        </div>
        <h2 className="font-display text-xl font-extrabold tracking-tight">
          Sua barbearia ainda não tem WhatsApp ligado
        </h2>
        <p className="text-sm text-subtle">
          Ao conectar, código de confirmação de agendamentos, lembretes 24h
          antes e mensagens diretas vão sair do seu próprio número.
        </p>
      </div>

      <ol className="space-y-2 rounded-md border border-line bg-surface-2 p-4 text-sm">
        <li className="flex gap-2">
          <span className="mono text-[10px] font-bold text-brand">1.</span>
          <span>Crie a instância (1 clique aqui).</span>
        </li>
        <li className="flex gap-2">
          <span className="mono text-[10px] font-bold text-brand">2.</span>
          <span>
            Vai aparecer um QR code. Escaneie com o WhatsApp do celular do dono
            ({" "}
            <strong>Menu → Aparelhos conectados → Conectar um aparelho</strong>
            ).
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mono text-[10px] font-bold text-brand">3.</span>
          <span>Pronto. Status muda pra Online e tudo flui.</span>
        </li>
      </ol>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-md border border-line bg-surface-2 p-3 text-xs text-subtle">
        <span className="mono text-[10px] uppercase tracking-wider">Nome da instância</span>
        <div className="mono mt-1 text-ink">lustro-{orgSlug || "<slug>"}</div>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={pending}
        className={cn(
          "tap inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-semibold text-brand-fg shadow-sm transition-all",
          pending
            ? "cursor-wait opacity-70"
            : "hover:-translate-y-px hover:shadow-lg",
        )}
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Criando instância...
          </>
        ) : (
          <>
            <Smartphone className="h-4 w-4" />
            Criar instância e mostrar QR
          </>
        )}
      </button>
    </div>
  );
}
