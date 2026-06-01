"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, Package, RotateCcw, ShoppingCart } from "lucide-react";

import {
  purchasePackageAction,
  refundSessionAction,
} from "@/app/admin/pacotes/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PackageOption = {
  id: string;
  name: string;
  serviceName: string;
  sessionsCount: number;
  priceLabel: string;
};

type ActivePackage = {
  id: string;
  packageName: string;
  serviceName: string;
  sessionsRemaining: number;
  sessionsCount: number;
  purchasedAt: Date;
  expiresAt: Date | null;
  expired: boolean;
};

type Props = {
  customerUserId: string;
  customerName: string;
  active: ActivePackage[];
  availablePackages: PackageOption[];
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function CustomerPackagesSection({
  customerUserId,
  customerName,
  active,
  availablePackages,
}: Props) {
  return (
    <section className="rounded-md border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
            <Package className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-display text-sm font-bold">
            Pacotes ({active.length})
          </h2>
        </div>
        {availablePackages.length > 0 ? (
          <SellPackageDialog
            customerUserId={customerUserId}
            customerName={customerName}
            packages={availablePackages}
          />
        ) : (
          <Link
            href="/admin/pacotes"
            className="text-[11px] text-subtle underline-offset-2 hover:text-brand hover:underline"
          >
            Cadastrar pacote →
          </Link>
        )}
      </div>

      {active.length === 0 ? (
        <p className="text-xs text-subtle">
          Sem pacotes ativos. Use &quot;Vender&quot; pra adicionar saldo.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((p) => (
            <ActivePackageRow
              key={p.id}
              pkg={p}
              customerUserId={customerUserId}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivePackageRow({
  pkg,
  customerUserId,
}: {
  pkg: ActivePackage;
  customerUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const pct = pkg.sessionsCount > 0
    ? (pkg.sessionsRemaining / pkg.sessionsCount) * 100
    : 0;

  function refund() {
    if (!confirm(`Estornar +1 sessão pro pacote "${pkg.packageName}"?`)) return;
    startTransition(async () => {
      const r = await refundSessionAction(pkg.id, customerUserId);
      if (r.error) alert(r.error);
    });
  }

  return (
    <li
      className={cn(
        "rounded-md border border-line bg-surface-2 p-3",
        pkg.expired && "opacity-60",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">
              {pkg.packageName}
            </span>
            {pkg.expired && (
              <span className="rounded-full bg-danger/10 px-1.5 py-0.5 mono text-[9px] font-semibold text-danger">
                expirado
              </span>
            )}
          </div>
          <div className="mono text-[10px] text-subtle">
            {pkg.serviceName} · comprado {formatDate(pkg.purchasedAt)}
            {pkg.expiresAt && <> · expira {formatDate(pkg.expiresAt)}</>}
          </div>
        </div>
        <div className="text-right">
          <div className="num font-display text-base font-extrabold">
            {pkg.sessionsRemaining}
            <span className="text-xs font-medium text-subtle">
              /{pkg.sessionsCount}
            </span>
          </div>
          <div className="mono text-[9px] uppercase tracking-wider text-subtle">
            sessões
          </div>
        </div>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full",
            pkg.expired
              ? "bg-danger/40"
              : pct > 30
                ? "bg-ok"
                : "bg-warn",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pkg.sessionsRemaining < pkg.sessionsCount && (
        <button
          type="button"
          disabled={pending}
          onClick={refund}
          className="tap inline-flex h-7 items-center gap-1 rounded-md border border-line bg-surface px-2 text-[11px] font-semibold text-subtle transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RotateCcw className="h-3 w-3" />
          )}
          Estornar 1 sessão
        </button>
      )}
    </li>
  );
}

function SellPackageDialog({
  customerUserId,
  customerName,
  packages,
}: {
  customerUserId: string;
  customerName: string;
  packages: PackageOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(packages[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSell() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const r = await purchasePackageAction(selectedId, customerUserId);
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="tap inline-flex h-8 items-center gap-1 rounded-md bg-brand px-3 text-xs font-semibold text-brand-fg hover:opacity-90"
        >
          <ShoppingCart className="h-3 w-3" />
          Vender
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Vender pacote
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Cria saldo pra {customerName}. Cobrança fica por sua conta —
            registre o pagamento separadamente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label
              htmlFor="pkg-select"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Pacote
            </label>
            <select
              id="pkg-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.sessionsCount}× {p.serviceName} ·{" "}
                  {p.priceLabel}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || !selectedId}
            onClick={handleSell}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm",
              pending ? "cursor-wait opacity-75" : "hover:-translate-y-px hover:shadow-lg",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            Confirmar venda
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
