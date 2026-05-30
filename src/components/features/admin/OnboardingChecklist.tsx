"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";

import { dismissOnboardingAction } from "@/app/admin/onboarding-action";
import type { OnboardingStep } from "@/lib/server/onboarding";
import { cn } from "@/lib/utils";

type Props = {
  steps: OnboardingStep[];
  completed: number;
  total: number;
};

export function OnboardingChecklist({ steps, completed, total }: Props) {
  const [isPending, startTransition] = useTransition();
  const pct = Math.round((completed / total) * 100);

  function handleDismiss() {
    startTransition(async () => {
      await dismissOnboardingAction();
    });
  }

  return (
    <section className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-brand-soft/40 via-surface to-surface p-5">
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Fechar checklist"
        className="tap absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <div className="font-display text-base font-bold">
            Configure sua barbearia
          </div>
          <p className="text-xs text-subtle">
            {completed} de {total} passos concluídos · cliente só consegue
            agendar depois que terminar.
          </p>
        </div>
      </div>

      <div className="mb-4 flex h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                "tap group flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 transition-all",
                s.done
                  ? "border-ok/30 bg-ok/5"
                  : "border-line hover:-translate-y-px hover:border-brand hover:shadow-sm",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  s.done
                    ? "bg-ok text-surface"
                    : "bg-surface-2 text-subtle",
                )}
              >
                {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    s.done && "text-subtle line-through",
                  )}
                >
                  {s.label}
                </span>
                <span className="block text-[11px] text-subtle">
                  {s.description}
                </span>
              </span>
              {!s.done && (
                <ArrowRight className="h-4 w-4 shrink-0 text-subtle transition-colors group-hover:text-brand" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
