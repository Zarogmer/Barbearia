"use client";

import { forwardRef, useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, Loader2, Plus } from "lucide-react";

import {
  createProfessionalAction,
  updateProfessionalAction,
} from "@/app/admin/profissionais/actions";
import {
  initialProfessionalState,
  type ProfessionalActionState,
} from "@/app/admin/profissionais/state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export type ServiceOption = { id: string; name: string };

export type ProfessionalDefaults = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  active: boolean;
  serviceIds: string[];
};

type Props = {
  mode: "create" | "edit";
  services: ServiceOption[];
  defaults?: ProfessionalDefaults;
  trigger: React.ReactNode;
};

export function ProfessionalFormDialog({ mode, services, defaults, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createProfessionalAction : updateProfessionalAction;
  const [state, dispatch] = useActionState<ProfessionalActionState, FormData>(
    action,
    initialProfessionalState,
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
            {mode === "create" ? "Novo profissional" : "Editar profissional"}
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            {mode === "create"
              ? "Cadastre um membro da equipe. Horários e bloqueios são configurados depois."
              : "Atualize dados básicos. Horários ficam na página de detalhe."}
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
            placeholder="Ex: João Silva"
            required
            error={state.fieldErrors?.name}
          />
          <Textarea
            id="bio"
            label="Bio"
            defaultValue={defaults?.bio ?? ""}
            placeholder="Especialidades, anos de experiência (opcional)"
            error={state.fieldErrors?.bio}
          />
          <ImageUpload
            name="photoUrl"
            label="Foto do profissional"
            defaultValue={defaults?.photoUrl ?? null}
            aspectRatio={1}
            hint="Aparece na vitrine + agenda. Quadrada (1:1) fica melhor."
          />

          <ServicesMultiSelect
            services={services}
            defaultSelected={defaults?.serviceIds ?? []}
            error={state.fieldErrors?.serviceIds}
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
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
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
        aria-invalid={!!error}
        className={cn(
          "h-11 w-full rounded-lg border bg-surface px-3.5 text-sm outline-none transition-all",
          error
            ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
            : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

function Textarea({
  id,
  label,
  defaultValue,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
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
      <textarea
        id={id}
        name={id}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={3}
        aria-invalid={!!error}
        className={cn(
          "w-full rounded-lg border bg-surface px-3.5 py-2 text-sm outline-none transition-all",
          error
            ? "border-danger focus:shadow-[0_0_0_4px_hsl(var(--danger)/0.18)]"
            : "border-line focus:border-brand focus:shadow-glow",
        )}
      />
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

function ServicesMultiSelect({
  services,
  defaultSelected,
  error,
}: {
  services: ServiceOption[];
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
        Serviços que executa
      </label>
      {services.length === 0 ? (
        <p className="mono text-[11px] text-subtle">
          Nenhum serviço cadastrado. Cadastre primeiro em{" "}
          <span className="text-ink">/admin/servicos</span>.
        </p>
      ) : (
        <div className="space-y-1.5">
          {services.map((s) => {
            const isSelected = selected.has(s.id);
            return (
              <label
                key={s.id}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border bg-surface px-3 py-2 transition-colors",
                  isSelected
                    ? "border-brand bg-brand-soft"
                    : "border-line hover:bg-surface-2",
                )}
              >
                <input
                  type="checkbox"
                  name="serviceIds"
                  value={s.id}
                  checked={isSelected}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 rounded border-line accent-[hsl(var(--brand))]"
                />
                <span className="text-sm font-medium">{s.name}</span>
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
          Inativo não aparece para clientes. Agendamentos futuros não são cancelados.
        </div>
      </div>
      <Switch name="active" checked={checked} onCheckedChange={setChecked} />
      <input type="hidden" name="active" value={checked ? "true" : "false"} />
    </div>
  );
}

// forwardRef + spread props é obrigatório pra Radix DialogTrigger asChild
// conseguir injetar onClick/ref no <button>. Sem isso, click não dispara.
export const NewProfessionalTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function NewProfessionalTrigger(props, ref) {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
    >
      <Plus className="h-4 w-4" />
      Novo profissional
    </button>
  );
});

export const EditProfessionalTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { name: string }
>(function EditProfessionalTrigger({ name, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Editar ${name}`}
      {...props}
      className="rounded-md p-2 text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <span className="sr-only">Editar</span>
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
    </button>
  );
});
