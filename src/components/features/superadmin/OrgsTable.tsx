"use client";

import { useMemo, useState, useTransition } from "react";
import { Ban, ExternalLink, Eye, Loader2, RefreshCw, Trash2, Undo2 } from "lucide-react";

import {
  cancelOrgDeletionAction,
  reactivateOrgAction,
  scheduleOrgDeletionAction,
  suspendOrgAction,
} from "@/app/superadmin/lojas/actions";
import { formatBRL } from "@/lib/utils";
import type { OrgListRow } from "@/lib/server/superadmin/orgs";

type Filter = "all" | "active" | "suspended" | "trialing" | "canceled" | "deleting";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Ativas" },
  { key: "suspended", label: "Suspensas" },
  { key: "trialing", label: "Trial" },
  { key: "canceled", label: "Canceladas" },
  { key: "deleting", label: "Excluindo" },
];

function PlanBadge({ plan }: { plan: OrgListRow["plan"] }) {
  const map: Record<OrgListRow["plan"], { label: string; cls: string }> = {
    active: {
      label: "PRO",
      cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
    },
    trialing: {
      label: "TRIAL",
      cls: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    },
    past_due: {
      label: "ATRASO",
      cls: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
    },
    canceled: {
      label: "CANCEL.",
      cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    },
    none: {
      label: "—",
      cls: "bg-surface-3 text-subtle",
    },
  };
  const it = map[plan];
  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider ${it.cls}`}
    >
      {it.label}
    </span>
  );
}

function StatusBadge({ status }: { status: OrgListRow["status"] }) {
  const map = {
    active: {
      label: "Ativa",
      cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
    },
    suspended: {
      label: "Suspensa",
      cls: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100",
    },
    deleting: {
      label: "Excluindo",
      cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
    },
  } as const;
  const it = map[status];
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${it.cls}`}>
      {it.label}
    </span>
  );
}

function ColorDot({ id }: { id: string }) {
  // Cor determinística a partir do UUID pra dar identidade visual sem
  // persistir tema. Mesma org sempre com mesma cor no painel.
  const hash = id
    .replace(/-/g, "")
    .slice(0, 6)
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palette = [
    "#7c3aed",
    "#f97316",
    "#0ea5e9",
    "#10b981",
    "#ef4444",
    "#eab308",
    "#ec4899",
    "#14b8a6",
  ];
  const color = palette[hash % palette.length];
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function RowActions({ row }: { row: OrgListRow }) {
  const [pending, startTransition] = useTransition();

  const doAction = (fn: () => Promise<void>) => {
    if (pending) return;
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        alert(`Falha: ${(e as Error).message}`);
      }
    });
  };

  const previewUrl = `/${row.slug}`;

  return (
    <div className="flex items-center justify-end gap-1">
      <a
        href={previewUrl}
        target="_blank"
        rel="noreferrer"
        title="Abrir vitrine publica"
        className="rounded-md p-1.5 text-subtle hover:bg-surface-2 hover:text-ink"
      >
        <Eye className="h-4 w-4" />
      </a>
      <a
        href={`${previewUrl}/agendar`}
        target="_blank"
        rel="noreferrer"
        title="Fluxo cliente"
        className="rounded-md p-1.5 text-subtle hover:bg-surface-2 hover:text-ink"
      >
        <ExternalLink className="h-4 w-4" />
      </a>

      {row.status === "suspended" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => doAction(() => reactivateOrgAction({ organizationId: row.id }))}
          title="Reativar"
          className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-900/30"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending || row.status === "deleting"}
          onClick={() => {
            const reason = window.prompt("Motivo da suspensao (opcional, aparece em auditoria):");
            if (reason === null) return;
            doAction(() =>
              suspendOrgAction({
                organizationId: row.id,
                reason: reason || undefined,
              }),
            );
          }}
          title="Suspender"
          className="rounded-md p-1.5 text-subtle hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50 dark:hover:bg-orange-900/30"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
        </button>
      )}

      {row.status === "deleting" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => doAction(() => cancelOrgDeletionAction({ organizationId: row.id }))}
          title="Cancelar exclusao"
          className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-900/30"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const days = window.prompt(
              "Agendar exclusao em quantos dias? (grace period, dono ainda pode cancelar)",
              "30",
            );
            if (!days) return;
            const n = Number(days);
            if (!Number.isInteger(n) || n < 1 || n > 90) {
              alert("Entre 1 e 90 dias.");
              return;
            }
            if (!window.confirm(`Agendar exclusao de ${row.name} em ${n} dias?`)) return;
            doAction(() =>
              scheduleOrgDeletionAction({
                organizationId: row.id,
                daysUntilDelete: n,
              }),
            );
          }}
          title="Agendar exclusao"
          className="rounded-md p-1.5 text-subtle hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function OrgsTable({ rows }: { rows: OrgListRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let out = rows;
    if (filter !== "all") {
      out = out.filter((r) => {
        switch (filter) {
          case "active":
            return r.status === "active";
          case "suspended":
            return r.status === "suspended";
          case "trialing":
            return r.plan === "trialing";
          case "canceled":
            return r.plan === "canceled";
          case "deleting":
            return r.status === "deleting";
        }
      });
    }
    if (search) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q) ||
          (r.ownerEmail?.toLowerCase().includes(q) ?? false) ||
          (r.address?.toLowerCase().includes(q) ?? false),
      );
    }
    return out;
  }, [rows, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, slug, email ou cidade..."
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand lg:max-w-md"
        />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                filter === f.key
                  ? "rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-md border border-line px-3 py-1.5 text-xs font-medium text-subtle hover:bg-surface-2 hover:text-ink"
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line bg-surface-2 text-left">
            <tr className="text-[10px] uppercase tracking-wider text-subtle">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cidade</th>
              <th className="px-4 py-3 text-right">Servicos</th>
              <th className="px-4 py-3 text-right">Agend. (30d)</th>
              <th className="px-4 py-3 text-right">Clientes</th>
              <th className="px-4 py-3 text-right">Fat. mes</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-subtle">
                  Nenhuma loja encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <span className="pt-1.5">
                        <ColorDot id={row.id} />
                      </span>
                      <div className="min-w-0 leading-tight">
                        <div className="truncate font-semibold">{row.name}</div>
                        <div className="mono truncate text-[10px] text-subtle">/{row.slug}</div>
                        <div className="truncate text-[11px] text-subtle">
                          {row.ownerEmail ?? "sem owner"}
                        </div>
                        <div className="text-[10px] text-subtle">
                          <span className="mr-2">
                            hoje: <b>{row.appointmentsToday}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-subtle">{row.address ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.servicesCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.appointmentsLast30d}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.clientsCount}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatBRL(row.revenueMonthCents)}
                  </td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={row.plan} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <RowActions row={row} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
