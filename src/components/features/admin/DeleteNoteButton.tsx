"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deleteNoteAction } from "@/app/admin/clientes/actions";
import { cn } from "@/lib/utils";

export function DeleteNoteButton({
  noteId,
  customerUserId,
}: {
  noteId: string;
  customerUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState(false);

  function handleClick() {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000);
      return;
    }
    startTransition(async () => {
      await deleteNoteAction(noteId, customerUserId);
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={handleClick}
      aria-label="Remover anotação"
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-colors",
        confirm
          ? "bg-danger/10 text-danger"
          : "text-subtle hover:bg-surface-2 hover:text-danger",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Trash2 className="h-3 w-3" />
      )}
      {confirm ? "Confirmar" : "Remover"}
    </button>
  );
}
