"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import type { MessageTemplate } from "@/lib/server/messages";
import { cn } from "@/lib/utils";

import { deleteMessageTemplateAction } from "./actions";
import { TemplateFormDialog } from "./TemplateFormDialog";

export function TemplateCard({ template }: { template: MessageTemplate }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover template "${template.title}"?`)) return;
    startTransition(async () => {
      const r = await deleteMessageTemplateAction(template.id);
      if (r.error) alert(r.error);
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-surface p-4 transition-opacity",
        template.active ? "border-line" : "border-line opacity-60",
        pending && "opacity-50",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-sm font-bold">
              {template.title}
            </h3>
            {template.key && (
              <span className="rounded-full bg-brand-soft px-1.5 py-0.5 mono text-[9px] font-semibold text-brand">
                {template.key}
              </span>
            )}
            {!template.active && (
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 mono text-[9px] font-semibold text-subtle">
                inativo
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TemplateFormDialog
            mode="edit"
            defaults={{
              id: template.id,
              title: template.title,
              body: template.body,
              key: template.key,
              active: template.active,
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={handleDelete}
            aria-label="Remover"
            className="tap rounded-md p-2 text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="whitespace-pre-line text-sm text-subtle">{template.body}</p>
    </div>
  );
}
