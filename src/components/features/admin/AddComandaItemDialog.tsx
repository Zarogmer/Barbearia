"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2, Plus } from "lucide-react";

import { addItemAction } from "@/app/admin/comandas/actions";
import {
  initialComandaActionState,
  type ComandaActionState,
} from "@/app/admin/comandas/state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatBRL } from "@/lib/utils";

type ServiceOption = {
  id: string;
  name: string;
  priceCents: number;
};

type ProductOption = {
  id: string;
  name: string;
  priceCents: number;
  currentStock: number;
};

type Props = {
  comandaId: string;
  services: ServiceOption[];
  products?: ProductOption[];
};

export function AddComandaItemDialog({
  comandaId,
  services,
  products = [],
}: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"SERVICE" | "PRODUCT" | "MANUAL">("SERVICE");
  const action = addItemAction.bind(null, comandaId);
  const [state, dispatch] = useActionState<ComandaActionState, FormData>(
    action,
    initialComandaActionState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
        >
          <Plus className="h-4 w-4" />
          Adicionar item
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Adicionar item
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Serviço do catálogo, produto do estoque ou item livre.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-3 flex gap-1 rounded-lg border border-line bg-surface-2 p-1">
          <TabBtn active={tab === "SERVICE"} onClick={() => setTab("SERVICE")}>
            Serviço
          </TabBtn>
          <TabBtn active={tab === "PRODUCT"} onClick={() => setTab("PRODUCT")}>
            Produto
          </TabBtn>
          <TabBtn active={tab === "MANUAL"} onClick={() => setTab("MANUAL")}>
            Livre
          </TabBtn>
        </div>

        <form action={dispatch} className="space-y-3.5">
          <input type="hidden" name="type" value={tab} />

          {state.error && !state.fieldErrors && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          {tab === "SERVICE" && (
            <>
              {services.length === 0 ? (
                <p className="rounded-md border border-dashed border-line bg-surface-2 p-3 text-center text-xs text-subtle">
                  Nenhum serviço cadastrado.
                </p>
              ) : (
                <div>
                  <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    Serviço *
                  </label>
                  <select
                    name="serviceId"
                    required
                    defaultValue={services[0]?.id}
                    className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatBRL(s.priceCents)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {tab === "PRODUCT" && (
            <>
              {products.length === 0 ? (
                <p className="rounded-md border border-dashed border-line bg-surface-2 p-3 text-center text-xs text-subtle">
                  Nenhum produto cadastrado em /admin/estoque.
                </p>
              ) : (
                <div>
                  <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
                    Produto *
                  </label>
                  <select
                    name="productId"
                    required
                    defaultValue={products[0]?.id}
                    className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {formatBRL(p.priceCents)} (estoque:{" "}
                        {p.currentStock})
                      </option>
                    ))}
                  </select>
                  <p className="mono mt-1 text-[10px] text-subtle">
                    Adicionar gera saída automática no estoque.
                  </p>
                </div>
              )}
            </>
          )}

          {tab === "MANUAL" && (
            <>
              <Field
                id="name"
                label="Nome do item *"
                placeholder="Ex: Pomada importada"
                required
                error={state.fieldErrors?.name}
              />
              <Field
                id="priceReais"
                label="Preço unitário (R$) *"
                type="number"
                step="0.01"
                placeholder="50,00"
                required
                mono
                error={state.fieldErrors?.unitPriceCents}
              />
            </>
          )}

          <Field
            id="quantity"
            label="Quantidade"
            type="number"
            defaultValue="1"
            min={1}
            mono
            error={state.fieldErrors?.quantity}
          />

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Cancelar
            </button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
        pending
          ? "cursor-wait opacity-75"
          : "hover:-translate-y-px hover:shadow-lg active:translate-y-0",
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Adicionando…
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Adicionar
        </>
      )}
    </button>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-surface text-ink shadow-sm"
          : "text-subtle hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  placeholder,
  required,
  step,
  min,
  mono,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  step?: string;
  min?: number;
  mono?: boolean;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
          mono && "mono",
          error
            ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
            : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
