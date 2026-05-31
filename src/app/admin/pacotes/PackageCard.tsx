"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { deletePackageAction } from "./actions";
import { PackageFormDialog } from "./PackageFormDialog";

type ServiceOption = { id: string; name: string; priceCents: number };

type Props = {
  pkg: {
    id: string;
    serviceId: string;
    name: string;
    sessionsCount: number;
    priceCents: number;
    priceLabel: string;
    pricePerSessionLabel: string;
    expiresInDays: number | null;
    active: boolean;
    serviceName: string;
  };
  services: ServiceOption[];
};

export function PackageCard({ pkg, services }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover pacote "${pkg.name}"?`)) return;
    startTransition(async () => {
      const r = await deletePackageAction(pkg.id);
      if (r.error) alert(r.error);
    });
  }

  return (
    <div
      className={cn(
        "rounded-md border bg-surface p-4 transition-opacity",
        pkg.active ? "border-line" : "border-line opacity-60",
        pending && "opacity-50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold">{pkg.name}</h3>
            {!pkg.active && (
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 mono text-[9px] font-semibold uppercase tracking-wider text-subtle">
                inativo
              </span>
            )}
          </div>
          <p className="text-xs text-subtle">
            {pkg.sessionsCount}× {pkg.serviceName}
            {pkg.expiresInDays && (
              <> · expira em {pkg.expiresInDays} dias</>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="num font-display text-lg font-extrabold">
            {pkg.priceLabel}
          </div>
          <div className="mono text-[10px] text-subtle">
            {pkg.pricePerSessionLabel}/sessão
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-line pt-2">
        <PackageFormDialog
          mode="edit"
          services={services}
          defaults={{
            id: pkg.id,
            name: pkg.name,
            serviceId: pkg.serviceId,
            sessionsCount: pkg.sessionsCount,
            priceCents: pkg.priceCents,
            expiresInDays: pkg.expiresInDays,
            active: pkg.active,
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
  );
}
