"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Loader2, Plus, Save, Trash2 } from "lucide-react";

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

import { createQuoteAction } from "./actions";

type Catalog = { id: string; name: string; priceCents: number };

type Props = {
  services: Catalog[];
  products: Catalog[];
};

type Item = {
  type: "SERVICE" | "PRODUCT" | "MANUAL";
  refId?: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function plusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function QuoteFormDialog({ services, products }: Props) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [expiresAt, setExpiresAt] = useState(plusDays(15));
  const [discountReais, setDiscountReais] = useState("0,00");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subtotal = items.reduce(
    (acc, i) => acc + i.quantity * i.unitPriceCents,
    0,
  );
  const discountCents = Math.round(
    Number(discountReais.replace(",", ".")) * 100,
  );
  const total = Math.max(0, subtotal - discountCents);

  function reset() {
    setCustomerName("");
    setCustomerPhone("");
    setExpiresAt(plusDays(15));
    setDiscountReais("0,00");
    setNotes("");
    setItems([]);
    setError(null);
  }

  function addItemFromCatalog(type: "SERVICE" | "PRODUCT", c: Catalog) {
    setItems((prev) => [
      ...prev,
      {
        type,
        refId: c.id,
        name: c.name,
        quantity: 1,
        unitPriceCents: c.priceCents,
      },
    ]);
  }

  function addManualItem() {
    setItems((prev) => [
      ...prev,
      { type: "MANUAL", name: "", quantity: 1, unitPriceCents: 0 },
    ]);
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((i, n) => (n === idx ? { ...i, ...patch } : i)));
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, n) => n !== idx));
  }

  function handleSave() {
    setError(null);
    if (items.length === 0) {
      setError("Adicione pelo menos 1 item.");
      return;
    }
    if (items.some((i) => !i.name || i.name.trim().length < 2)) {
      setError("Todos os itens precisam ter nome (mín 2 chars).");
      return;
    }
    startTransition(async () => {
      const r = await createQuoteAction({
        customerName,
        customerPhone: customerPhone || undefined,
        expiresAt: expiresAt || undefined,
        discountCents,
        notes: notes || undefined,
        items: items.map((i) => ({
          type: i.type,
          refId: i.refId,
          name: i.name,
          quantity: i.quantity,
          unitPriceCents: i.unitPriceCents,
        })),
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-lg"
        >
          <Plus className="h-4 w-4" />
          Novo orçamento
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            Novo orçamento
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Adicione itens do catálogo ou manuais. Compartilhe via WhatsApp
            quando salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="customerName"
              label="Cliente *"
              value={customerName}
              onChange={setCustomerName}
              placeholder="João Silva"
              required
            />
            <Field
              id="customerPhone"
              label="WhatsApp"
              value={customerPhone}
              onChange={setCustomerPhone}
              placeholder="(11) 99999-8888"
              mono
            />
          </div>

          <div>
            <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
              Itens ({items.length})
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              <AddDropdown
                label="+ Serviço"
                items={services}
                onPick={(c) => addItemFromCatalog("SERVICE", c)}
              />
              <AddDropdown
                label="+ Produto"
                items={products}
                onPick={(c) => addItemFromCatalog("PRODUCT", c)}
              />
              <button
                type="button"
                onClick={addManualItem}
                className="tap inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-xs font-semibold text-subtle hover:border-brand hover:text-brand"
              >
                <Plus className="h-3 w-3" />
                Manual
              </button>
            </div>
            {items.length === 0 ? (
              <p className="rounded-md border border-dashed border-line p-3 text-center text-xs text-subtle">
                Nenhum item ainda.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {items.map((it, idx) => (
                  <li
                    key={idx}
                    className="grid grid-cols-[1fr_50px_80px_24px] items-center gap-2 rounded-md border border-line bg-surface-2 p-2"
                  >
                    <input
                      type="text"
                      value={it.name}
                      onChange={(e) => updateItem(idx, { name: e.target.value })}
                      placeholder="Nome do item"
                      className="h-9 rounded-md border border-line bg-surface px-2 text-xs outline-none focus:border-brand"
                    />
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(idx, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="mono h-9 rounded-md border border-line bg-surface px-2 text-xs outline-none focus:border-brand"
                    />
                    <input
                      type="text"
                      value={(it.unitPriceCents / 100).toFixed(2).replace(".", ",")}
                      onChange={(e) =>
                        updateItem(idx, {
                          unitPriceCents: Math.round(
                            Number(e.target.value.replace(",", ".")) * 100,
                          ) || 0,
                        })
                      }
                      placeholder="0,00"
                      className="mono h-9 rounded-md border border-line bg-surface px-2 text-xs outline-none focus:border-brand"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      aria-label="Remover"
                      className="tap rounded-md p-1.5 text-subtle hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="discountReais"
              label="Desconto (R$)"
              value={discountReais}
              onChange={setDiscountReais}
              placeholder="0,00"
              mono
            />
            <Field
              id="expiresAt"
              label="Válido até"
              type="date"
              value={expiresAt}
              onChange={setExpiresAt}
              defaultValue={todayIso()}
              mono
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Observação
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Condição de pagamento, próximos passos…"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:shadow-glow"
            />
          </div>

          <div className="rounded-md border border-line bg-surface-2 p-3 text-sm">
            <div className="flex justify-between mono text-xs text-subtle">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between mono text-xs text-warn">
                <span>Desconto</span>
                <span>-{formatBRL(discountCents)}</span>
              </div>
            )}
            <div className="mt-1 flex items-baseline justify-between border-t border-line pt-1">
              <span className="text-xs font-semibold">Total</span>
              <span className="num font-display text-xl font-extrabold">
                {formatBRL(total)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-line bg-surface px-6 py-3 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || items.length === 0 || customerName.length < 2}
            onClick={handleSave}
            className={cn(
              "inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm",
              pending || items.length === 0 || customerName.length < 2
                ? "cursor-not-allowed opacity-60"
                : "hover:-translate-y-px hover:shadow-lg",
            )}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Criar como rascunho
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDropdown({
  label,
  items,
  onPick,
}: {
  label: string;
  items: Catalog[];
  onPick: (c: Catalog) => void;
}) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="tap inline-flex h-8 items-center gap-1 rounded-md border border-line bg-surface px-2.5 text-xs font-semibold text-subtle hover:border-brand hover:text-brand"
      >
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-10 max-h-48 w-56 overflow-y-auto rounded-md border border-line bg-surface shadow-lg">
          <ul className="divide-y divide-line text-xs">
            {items.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(c);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-surface-2"
                >
                  <span className="truncate">{c.name}</span>
                  <span className="mono shrink-0 text-subtle">
                    {formatBRL(c.priceCents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  mono,
  defaultValue,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  mono?: boolean;
  defaultValue?: string;
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
        type={type}
        value={value || defaultValue || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={cn(
          "h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm outline-none focus:border-brand focus:shadow-glow",
          mono && "mono",
        )}
      />
    </div>
  );
}
