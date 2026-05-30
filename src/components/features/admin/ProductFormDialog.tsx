"use client";

import { forwardRef, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Pencil, Plus } from "lucide-react";

import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/app/admin/estoque/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const initialState: ProductActionState = {};

export type ProductDefaults = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  salePriceCents: number;
  costPriceCents: number;
  minStock: number;
  active: boolean;
};

type Props = {
  mode: "create" | "edit";
  defaults?: ProductDefaults;
  trigger: React.ReactNode;
};

function centsToReal(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function ProductFormDialog({ mode, defaults, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, dispatch] = useActionState<ProductActionState, FormData>(
    action,
    initialState,
  );
  const [active, setActive] = useState(defaults?.active ?? true);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "create" ? "Novo produto" : "Editar produto"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            {mode === "create"
              ? "Cadastre um produto pra vender no balcão."
              : "Atualize os detalhes do produto."}
          </DialogDescription>
        </DialogHeader>

        <form action={dispatch} className="space-y-3.5">
          {mode === "edit" && defaults && (
            <input type="hidden" name="id" value={defaults.id} />
          )}

          {state.error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}

          <Field
            id="name"
            label="Nome do produto"
            defaultValue={defaults?.name ?? ""}
            placeholder="Ex: Pomada modeladora"
            required
            error={state.fieldErrors?.name}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="sku"
              label="SKU (opcional)"
              defaultValue={defaults?.sku ?? ""}
              placeholder="POM-001"
              mono
              error={state.fieldErrors?.sku}
            />
            <Field
              id="minStock"
              label="Estoque mínimo"
              type="number"
              defaultValue={String(defaults?.minStock ?? 0)}
              min={0}
              mono
              error={state.fieldErrors?.minStock}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="salePrice"
              label="Preço venda (R$)"
              defaultValue={
                defaults ? centsToReal(defaults.salePriceCents) : ""
              }
              placeholder="0,00"
              required
              mono
              error={state.fieldErrors?.salePriceCents}
            />
            <Field
              id="costPrice"
              label="Custo (R$)"
              defaultValue={
                defaults ? centsToReal(defaults.costPriceCents) : "0,00"
              }
              placeholder="0,00"
              mono
              error={state.fieldErrors?.costPriceCents}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaults?.description ?? ""}
              rows={2}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
            />
          </div>

          <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
            <label htmlFor="active" className="cursor-pointer text-sm">
              <div className="font-semibold">Produto ativo</div>
              <div className="text-xs text-subtle">
                Inativo não aparece nas comandas.
              </div>
            </label>
            <Switch
              id="active"
              checked={active}
              onCheckedChange={setActive}
            />
            <input
              type="hidden"
              name="active"
              value={active ? "true" : "false"}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Cancelar
            </button>
            <SubmitButton mode={mode} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
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
          Salvando…
        </>
      ) : (
        <>
          <Check className="h-4 w-4" />
          {mode === "create" ? "Criar produto" : "Salvar"}
        </>
      )}
    </button>
  );
}

function Field({
  id,
  label,
  defaultValue,
  required,
  placeholder,
  type = "text",
  min,
  mono,
  error,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
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
        min={min}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
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

export const NewProductTrigger = forwardRef<HTMLButtonElement>(
  function NewProductTrigger(props, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...props}
        className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
      >
        <Plus className="h-4 w-4" />
        Novo produto
      </button>
    );
  },
);

export const EditProductTrigger = forwardRef<HTMLButtonElement, { name: string }>(
  function EditProductTrigger({ name, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...props}
        aria-label={`Editar ${name}`}
        className="tap inline-flex h-8 w-8 items-center justify-center rounded-md text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  },
);
