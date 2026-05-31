"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  testCloudinaryUploadAction,
  type CloudinaryDebugResult,
} from "./actions";

export function CloudinaryDebugPanel() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CloudinaryDebugResult | null>(null);

  function runTest() {
    startTransition(async () => {
      const r = await testCloudinaryUploadAction();
      setResult(r);
    });
  }

  return (
    <section className="space-y-3 rounded-md border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Teste de upload
          </div>
          <p className="text-xs text-subtle">
            Envia um PNG 1×1 transparente pro Cloudinary. Se a config tiver
            certa, devolve 200 OK.
          </p>
        </div>
        <button
          type="button"
          onClick={runTest}
          disabled={pending}
          className={cn(
            "tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
            pending
              ? "cursor-wait opacity-75"
              : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
          )}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Testando…
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Rodar teste
            </>
          )}
        </button>
      </div>

      {result && (
        <div
          className={cn(
            "rounded-md border p-3 text-xs",
            result.ok
              ? "border-ok/30 bg-ok/5 text-ok"
              : "border-danger/30 bg-danger/5 text-danger",
          )}
        >
          <div className="flex items-start gap-2">
            {result.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="space-y-1">
              <div className="font-semibold">
                {result.ok ? "Sucesso" : "Falhou"}
                {result.status ? ` · HTTP ${result.status}` : ""}
              </div>
              {result.message && (
                <div className="text-ink">{result.message}</div>
              )}
              {result.signedString && (
                <div className="mt-2 space-y-0.5 text-[11px]">
                  <div>
                    <span className="text-subtle">String assinada:</span>{" "}
                    <span className="mono">{result.signedString}</span>
                  </div>
                  <div>
                    <span className="text-subtle">Signature enviada:</span>{" "}
                    <span className="mono">{result.signature}</span>
                  </div>
                </div>
              )}
              {result.body && !result.ok && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-subtle">
                    Resposta crua do Cloudinary
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-surface-2 p-2 text-[10px] text-ink">
                    {result.body}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
