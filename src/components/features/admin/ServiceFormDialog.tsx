"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

import {
  createServiceAction,
  initialServiceState,
  updateServiceAction,
  type ServiceActionState,
} from "@/app/admin/servicos/actions";
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

export type ProfessionalOption = { id: string; name: string; active: boolean };

export type ServiceDefaults = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  professionalIds: string[];
};

type Props = {
  mode: "create" | "edit";
  professionals: ProfessionalOption[];
  defaults?: ServiceDefaults;
  trigger: React.ReactNode;
};

export function ServiceFormDialog({ mode, professionals, defaults, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createServiceAction : updateServiceAction;
  const [state, dispatch] = useActionState<ServiceActionState, FormData>(
    action,
    initialServiceState,
  );

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            {mode === "create" ? "Novo serviço" : "Editar serviço"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            {mode === "create"
              ? "Cadastre um novo serviço do catálogo."
              : "Atualize os detalhes do serviço."}
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
            label="Nome *"
            defaultValue={defaults?.name}
            placeholder="Ex: Corte degradê"
            required
            error={state.fieldErrors?.name}
          />

          <Field
            id="description"
            label="Descrição"
            defaultValue={defaults?.description ?? ""}
            placeholder="O que está incluso (opcional)"
            error={state.fieldErrors?.description}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              id="durationMinutes"
              label="Duração *"
              type="number"
              defaultValue={defaults?.durationMinutes?.toString()}
              placeholder="30"
              suffix="min"
              required
              error={state.fieldErrors?.durationMinutes}
              mono
            />
            <Field
              id="priceCents"
              label="Preço *"
              type="number"
              step="0.01"
              defaultValue={
                defaults ? (defaults.priceCents / 100).toFixed(2) : undefined
              }
              placeholder="50,00"
              prefix="R$"
              required
              error={state.fieldErrors?.priceCents}
              mono
            />
          </div>

          <ProfessionalsMultiSelect
            professionals={professionals}
            defaultSelected={defaults?.professionalIds ?? []}
            error={state.fieldErrors?.professionalIds}
          />

          <ActiveToggle defaultActive={defaults?.active ?? true} />

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
        "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
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
          {mode === "create" ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {mode === "create" ? "Criar" : "Salvar"}
        </>
      )}
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
  error,
  suffix,
  prefix,
  step,
  mono,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  required?: boolean;
  error?: string;
  suffix?: string;
  prefix?: string;
  step?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
      >
        {label}
      </label>
      <div
        className={cn(
          "flex h-11 items-center rounded-lg border bg-surface transition-all focus-within:border-brand focus-within:shadow-glow",
          error ? "border-danger" : "border-line",
        )}
      >
        {prefix && (
          <span className="pl-3 mono text-xs text-subtle">{prefix}</span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          step={step}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          className={cn(
            "flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-subtle/60",
            mono && "mono",
          )}
        />
        {suffix && (
          <span className="pr-3 mono text-xs text-subtle">{suffix}</span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

function ProfessionalsMultiSelect({
  professionals,
  defaultSelected,
  error,
}: {
  professionals: ProfessionalOption[];
  defaultSelected: string[];
  error?: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelected));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <label className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
        Profissionais
      </label>
      {professionals.length === 0 ? (
        <p className="mono text-[11px] text-subtle">
          Nenhum profissional cadastrado. Cadastre primeiro em <span className="text-ink">/admin/profissionais</span>.
        </p>
      ) : (
        <div className="space-y-1.5">
          {professionals.map((p) => {
            const isSelected = selected.has(p.id);
            return (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border bg-surface px-3 py-2 transition-colors",
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-line hover:bg-surface-2",
                  !p.active && "opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  name="professionalIds"
                  value={p.id}
                  checked={isSelected}
                  onChange={() => toggle(p.id)}
                  className="h-4 w-4 rounded border-line accent-[hsl(var(--brand))]"
                />
                <span className="text-sm font-medium">{p.name}</span>
                {!p.active && (
                  <span className="mono text-[9px] uppercase tracking-wider text-subtle">
                    inativo
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

function ActiveToggle({ defaultActive }: { defaultActive: boolean }) {
  const [checked, setChecked] = useState(defaultActive);
  return (
    <div className="flex items-center justify-between rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div>
        <div className="text-sm font-medium">Ativo</div>
        <div className="text-[11px] text-subtle">
          Quando inativo, não aparece no fluxo de agendamento.
        </div>
      </div>
      <Switch
        name="active"
        checked={checked}
        onCheckedChange={setChecked}
      />
      {/* Switch do shadcn não popula FormData. Hidden input replica o valor. */}
      <input type="hidden" name="active" value={checked ? "true" : "false"} />
    </div>
  );
}

export function NewServiceTrigger() {
  return (
    <button
      type="button"
      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
    >
      <Plus className="h-4 w-4" />
      Novo serviço
    </button>
  );
}

export function EditServiceTrigger({ name }: { name: string }) {
  return (
    <button
      type="button"
      aria-label={`Editar ${name}`}
      className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <span className="sr-only">Editar</span>
      <Pencil />
    </button>
  );
}

function Pencil() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

