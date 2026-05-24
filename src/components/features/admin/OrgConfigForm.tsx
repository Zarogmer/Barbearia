"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, AlertTriangle, Check, Loader2 } from "lucide-react";

import { updateOrganizationAction } from "@/app/admin/configuracoes/actions";
import {
  initialOrgConfigState,
  type OrgConfigState,
} from "@/app/admin/configuracoes/state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
  defaults: {
    name: string;
    slug: string;
    timezone: string;
    allowGuestBooking: boolean;
  };
};

export function OrgConfigForm({ defaults }: Props) {
  const [state, dispatch] = useActionState<OrgConfigState, FormData>(
    updateOrganizationAction,
    initialOrgConfigState,
  );

  const [slug, setSlug] = useState(defaults.slug);
  const [allowGuest, setAllowGuest] = useState(defaults.allowGuestBooking);
  const [confirmingSlug, setConfirmingSlug] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const slugChanged = slug !== defaults.slug;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (slugChanged) {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      setPendingFormData(formData);
      setConfirmingSlug(true);
    }
  }

  function confirmSlugChange() {
    if (pendingFormData) {
      dispatch(pendingFormData);
    }
    setConfirmingSlug(false);
    setPendingFormData(null);
  }

  return (
    <>
      <form
        action={dispatch}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {state.error && !state.fieldErrors && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.error}</span>
          </div>
        )}
        {state.ok && (
          <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/5 p-3 text-xs text-ok">
            <Check className="h-4 w-4" />
            Configurações salvas.
          </div>
        )}

        <Field
          id="name"
          label="Nome da barbearia"
          defaultValue={defaults.name}
          required
          error={state.fieldErrors?.name}
        />

        <div>
          <label
            htmlFor="slug"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            URL (slug) *
          </label>
          <div
            className={cn(
              "flex h-11 items-center rounded-lg border bg-surface pl-3 text-sm transition-all focus-within:shadow-[0_0_0_4px_hsl(var(--brand)/0.18)]",
              state.fieldErrors?.slug
                ? "border-danger"
                : "border-line focus-within:border-brand",
            )}
          >
            <span className="mono text-subtle">barbearia.app/</span>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              className="mono flex-1 bg-transparent px-1 outline-none"
            />
          </div>
          {state.fieldErrors?.slug ? (
            <p className="mt-1 text-[11px] text-danger">{state.fieldErrors.slug}</p>
          ) : (
            <p className="mt-1.5 text-xs text-subtle">
              Apenas letras minúsculas, números e hífen. Mudar quebra links
              antigos.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="tz"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            Fuso horário
          </label>
          <input
            id="tz"
            disabled
            value={defaults.timezone}
            className="mono h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-subtle"
          />
          <p className="mt-1.5 text-xs text-subtle">Configurável em v2.</p>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2 p-3">
          <label htmlFor="allowGuestBooking" className="cursor-pointer text-sm">
            <div className="font-semibold">Permitir agendamento sem cadastro</div>
            <div className="text-xs text-subtle">
              Cliente fornece nome e email mas não precisa criar senha. Útil
              para fluxo rápido.
            </div>
          </label>
          <Switch
            id="allowGuestBooking"
            checked={allowGuest}
            onCheckedChange={setAllowGuest}
          />
          <input
            type="hidden"
            name="allowGuestBooking"
            value={allowGuest ? "true" : "false"}
          />
        </div>

        <SaveButton />
      </form>

      <Dialog open={confirmingSlug} onOpenChange={setConfirmingSlug}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-warn/15 text-warn">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="font-display text-base font-bold">
              Mudar a URL pública?
            </DialogTitle>
            <DialogDescription className="text-xs text-subtle">
              <div className="space-y-1.5">
                <div>
                  De{" "}
                  <span className="mono font-semibold text-ink">
                    /{defaults.slug}
                  </span>{" "}
                  para{" "}
                  <span className="mono font-semibold text-ink">/{slug}</span>.
                </div>
                <div>
                  Quem tinha o link antigo recebe 404. Atualize qualquer
                  divulgação (cartão, Instagram, etc.) depois de salvar.
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setConfirmingSlug(false);
                setSlug(defaults.slug);
                setPendingFormData(null);
              }}
              className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmSlugChange}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-warn px-4 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
            >
              <Check className="h-4 w-4" />
              Mudar URL
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all",
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
          Salvar alterações
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
  error,
}: {
  id: string;
  label: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
