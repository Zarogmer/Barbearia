import { redirect } from "next/navigation";

import { DeactivateProductButton } from "@/components/features/admin/DeactivateProductButton";
import { InventoryMovementDialog } from "@/components/features/admin/InventoryMovementDialog";
import {
  EditProductTrigger,
  NewProductTrigger,
  ProductFormDialog,
} from "@/components/features/admin/ProductFormDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { CommissionIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listProducts } from "@/lib/server/products";
import { cn, formatBRL } from "@/lib/utils";

const STATUS_STYLE = {
  ok: "bg-ok/10 text-ok",
  low: "bg-warn/15 text-warn",
  critical: "bg-danger/10 text-danger",
  negative: "bg-danger/20 text-danger",
} as const;

const STATUS_LABEL = {
  ok: "OK",
  low: "Baixo",
  critical: "Crítico",
  negative: "Negativo",
} as const;

export default async function EstoquePage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/estoque");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
        <header>
          <div className="eyebrow mb-3">Balcão</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Estoque
          </h1>
        </header>
        <div className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER para gerenciar estoque.
        </div>
      </div>
    );
  }
  const orgId = owner.organizationId;
  const products = await listProducts(orgId);
  const belowMin = products.filter(
    (p) => p.active && (p.stockStatus === "low" || p.stockStatus === "critical"),
  ).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">Balcão</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Estoque
          </h1>
          <p className="text-sm text-subtle">
            <span className="mono">{products.length}</span>{" "}
            produto{products.length !== 1 && "s"}
            {belowMin > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-warn">
                  {belowMin} abaixo do mínimo
                </span>
              </>
            )}
          </p>
        </div>
        <ProductFormDialog mode="create" trigger={<NewProductTrigger />} />
      </header>

      {products.length === 0 ? (
        <EmptyState
          icon={<CommissionIllustration />}
          title="Cadastre seu primeiro produto"
          description="Pomada, óleo, shampoo, qualquer item que você vende no balcão. Depois adiciona em comandas e o estoque atualiza sozinho."
          cta={null}
        />
      ) : (
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="hidden border-b border-line bg-surface-2 px-5 py-3 mono text-[10px] font-semibold uppercase tracking-wider text-subtle sm:grid sm:grid-cols-[1fr_100px_120px_110px_100px_140px] sm:items-center sm:gap-4">
            <div>Produto</div>
            <div className="text-center">Estoque</div>
            <div>Preço venda</div>
            <div>Custo</div>
            <div>Status</div>
            <div className="text-right">Ações</div>
          </div>
          <div className="divide-y divide-line">
            {products.map((p) => {
              const editDialog = (
                <ProductFormDialog
                  mode="edit"
                  defaults={{
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    description: p.description,
                    salePriceCents: p.salePriceCents,
                    costPriceCents: p.costPriceCents,
                    minStock: p.minStock,
                    active: p.active,
                  }}
                  trigger={<EditProductTrigger name={p.name} />}
                />
              );
              const moveDialog = (
                <InventoryMovementDialog
                  productId={p.id}
                  productName={p.name}
                  currentStock={p.currentStock}
                />
              );
              const deactivateBtn = (
                <DeactivateProductButton
                  productId={p.id}
                  productName={p.name}
                />
              );
              return (
                <div
                  key={p.id}
                  className="px-4 py-3 transition-colors hover:bg-surface-2 sm:grid sm:grid-cols-[1fr_100px_120px_110px_100px_140px] sm:items-center sm:gap-4 sm:px-5 sm:py-4"
                >
                  {/* Mobile: layout denso */}
                  <div className="sm:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">
                            {p.name}
                          </span>
                          {!p.active && (
                            <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-subtle">
                              Inativo
                            </span>
                          )}
                        </div>
                        {p.sku && (
                          <div className="mono text-[11px] text-subtle">
                            {p.sku}
                          </div>
                        )}
                      </div>
                      <div className="mono shrink-0 text-sm font-semibold">
                        {formatBRL(p.salePriceCents)}
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="mono text-[11px]">
                          estoque:{" "}
                          <span
                            className={cn(
                              "font-semibold",
                              p.currentStock < 0 ? "text-danger" : "text-ink",
                            )}
                          >
                            {p.currentStock}
                          </span>
                        </span>
                        {p.minStock > 0 && (
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                              STATUS_STYLE[p.stockStatus],
                            )}
                          >
                            {STATUS_LABEL[p.stockStatus]}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {moveDialog}
                        {editDialog}
                        {deactivateBtn}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: grid 6 colunas */}
                  <div className="hidden min-w-0 sm:block">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">{p.name}</span>
                      {!p.active && (
                        <span className="rounded-full bg-surface-3 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-subtle">
                          Inativo
                        </span>
                      )}
                    </div>
                    {p.sku && (
                      <div className="mono truncate text-xs text-subtle">
                        {p.sku}
                      </div>
                    )}
                  </div>
                  <div
                    className={cn(
                      "mono hidden text-center text-sm font-semibold sm:block",
                      p.currentStock < 0 && "text-danger",
                    )}
                  >
                    {p.currentStock}
                    {p.minStock > 0 && (
                      <span className="mono ml-1 text-[10px] text-subtle">
                        / min {p.minStock}
                      </span>
                    )}
                  </div>
                  <div className="hidden mono text-sm font-semibold sm:block">
                    {formatBRL(p.salePriceCents)}
                  </div>
                  <div className="hidden mono text-xs text-subtle sm:block">
                    {p.costPriceCents > 0 ? formatBRL(p.costPriceCents) : "—"}
                  </div>
                  <div className="hidden sm:block">
                    {p.minStock > 0 ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          STATUS_STYLE[p.stockStatus],
                        )}
                      >
                        {STATUS_LABEL[p.stockStatus]}
                      </span>
                    ) : (
                      <span className="mono text-[10px] text-subtle">—</span>
                    )}
                  </div>
                  <div className="hidden items-center justify-end gap-1 sm:flex">
                    {moveDialog}
                    {editDialog}
                    {deactivateBtn}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
