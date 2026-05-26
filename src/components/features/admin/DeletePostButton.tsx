"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deletePostAction } from "@/app/admin/feed/actions";
import { cn } from "@/lib/utils";

export function DeletePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleClick() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    startTransition(async () => {
      await deletePostAction(postId);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      aria-label="Remover post"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border bg-surface px-3 text-xs font-semibold transition-colors",
        confirm
          ? "border-danger text-danger"
          : "border-line text-subtle hover:border-danger/40 hover:text-danger",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      {confirm ? "Confirmar" : "Remover"}
    </button>
  );
}
