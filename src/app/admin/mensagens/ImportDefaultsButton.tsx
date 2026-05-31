"use client";

import { useTransition } from "react";
import { Download, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { importDefaultTemplatesAction } from "./actions";

export function ImportDefaultsButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const r = await importDefaultTemplatesAction();
      if (r.error) alert(r.error);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      className={cn(
        "tap inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:border-brand hover:bg-brand-soft",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Importar 5 exemplos
    </button>
  );
}
