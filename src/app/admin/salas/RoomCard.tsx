"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import type { AdminRoom } from "@/lib/server/rooms";
import { cn } from "@/lib/utils";

import { deleteRoomAction } from "./actions";
import { RoomFormDialog } from "./RoomFormDialog";

export function RoomCard({ room }: { room: AdminRoom }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover sala "${room.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteRoomAction(room.id);
      if (r.error) alert(r.error);
    });
  }

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-3 transition-opacity",
        !room.active && "opacity-60",
        pending && "opacity-50",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{room.name}</span>
          {!room.active && (
            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 mono text-[9px] font-semibold uppercase tracking-wider text-subtle">
              inativa
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <RoomFormDialog
          mode="edit"
          defaults={{ id: room.id, name: room.name, active: room.active }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          aria-label="Remover"
          className="tap rounded-md p-2 text-subtle hover:bg-danger/10 hover:text-danger"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </li>
  );
}
