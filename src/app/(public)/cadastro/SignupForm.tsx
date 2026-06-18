"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Loader2,
  Phone,
  RotateCw,
  Store,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { slugifyOrgName } from "@/lib/validators/auth";

import {
  createOrgAction,
  requestSignupAction,
  resendSignupOtpAction,
  verifySignupAction,
} from "./actions";
import { initialSignupState, type SignupState } from "./state";

const RESEND_COOLDOWN_SEC = 60;

export function SignupForm() {
  const [state, dispatch] = useActionState<SignupState, FormData>(
    (prev, fd) => {
      if (prev.step === "verify") return verifySignupAction(prev, fd);
      if (prev.step === "org") return createOrgAction(prev, fd);
      return requestSignupAction(prev, fd);
    },
    initialSignupState,
  );

  if (state.step === "verify") {
    return <VerifyStep state={state} dispatch={dispatch} />;
  }
  if (state.step === "org") {
    return <OrgStep state={state} dispatch={dispatch} />;
  }
  return <RequestStep state={state} dispatch={dispatch} />;
}

// ─── Etapa 1: dados + telefone ──────────────────────────────────────

function RequestStep({
  state,
  dispatch,
}: {
  state: Extract<SignupState, { step: "request" }>;
  dispatch: (fd: FormData) => void;
}) {
  return (
    <form action={dispatch} className="space-y-4">
      {state.error && !state.fieldErrors && <ErrorAlert message={state.error} />}

      <Field
        id="name"
        label="Nome completo"
        defaultValue={state.values?.name}
        autoComplete="name"
        required
        minLength={2}
        maxLength={80}
        error={state.fieldErrors?.name}
      />
      <Field
        id="email"
        label="Email"
        type="email"
        defaultValue={state.values?.email}
        autoComplete="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        id="phone"
        label="WhatsApp"
        type="tel"
        defaultValue={state.values?.phone}
        autoComplete="tel"
        placeholder="(11) 99999-8888"
        required
        error={state.fieldErrors?.phone}
        hint="Vamos enviar um código pra confirmar."
      />
      <Field
        id="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={72}
        error={state.fieldErrors?.password}
        hint="Mínimo 8 caracteres."
      />

      <label className="flex items-start gap-2.5 pt-1 text-xs">
        <input
          name="acceptedTerms"
          type="checkbox"
          required
          className="mt-0.5 h-4 w-4 rounded border-input"
        />
        <span className="text-muted-foreground">
          Aceito receber WhatsApp com código de confirmação e concordo com os{" "}
          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            termos de uso
          </a>{" "}
          e a{" "}
          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            política de privacidade
          </a>
          .
        </span>
      </label>
      {state.fieldErrors?.acceptedTerms && (
        <p className="text-xs text-destructive">
          {state.fieldErrors.acceptedTerms}
        </p>
      )}

      <RequestSubmit />
    </form>
  );
}

function RequestSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enviando código…
        </>
      ) : (
        <>
          <Phone className="mr-2 h-4 w-4" />
          Enviar código por WhatsApp
        </>
      )}
    </Button>
  );
}

// ─── Etapa 2: OTP ───────────────────────────────────────────────────

function VerifyStep({
  state,
  dispatch,
}: {
  state: Extract<SignupState, { step: "verify" }>;
  dispatch: (fd: FormData) => void;
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function handleResend() {
    await resendSignupOtpAction(state.phone);
    setCooldown(RESEND_COOLDOWN_SEC);
  }

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="name" value={state.name} />
      <input type="hidden" name="email" value={state.email} />
      <input type="hidden" name="phone" value={state.phone} />
      <input type="hidden" name="passwordHash" value={state.passwordHash} />

      <div className="rounded-md border bg-muted/30 p-3 text-xs">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Código enviado pra
        </div>
        <div className="font-mono font-semibold">{state.phone}</div>
      </div>

      {state.error && <ErrorAlert message={state.error} />}

      <div className="space-y-1">
        <label
          htmlFor="code"
          className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Código *
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          autoFocus
          required
          aria-invalid={!!state.fieldErrors?.code}
          className={cn(
            "h-14 w-full rounded-md border bg-background px-3.5 text-center font-mono text-2xl font-bold tracking-[0.3em] outline-none focus:ring-2 focus:ring-ring",
            state.fieldErrors?.code && "border-destructive",
          )}
          placeholder="000000"
        />
        {state.fieldErrors?.code && (
          <p className="text-xs text-destructive">{state.fieldErrors.code}</p>
        )}
      </div>

      <VerifySubmit />

      <button
        type="button"
        disabled={cooldown > 0}
        onClick={handleResend}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 text-xs transition-colors",
          cooldown > 0
            ? "cursor-not-allowed text-muted-foreground"
            : "text-foreground hover:underline",
        )}
      >
        <RotateCw className="h-3 w-3" />
        {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Não recebi — reenviar"}
      </button>
    </form>
  );
}

function VerifySubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Confirmando…
        </>
      ) : (
        <>
          <Check className="mr-2 h-4 w-4" />
          Confirmar código
        </>
      )}
    </Button>
  );
}

// ─── Etapa 3: criar barbearia ───────────────────────────────────────

function OrgStep({
  state,
  dispatch,
}: {
  state: Extract<SignupState, { step: "org" }>;
  dispatch: (fd: FormData) => void;
}) {
  const [orgName, setOrgName] = useState(state.values?.orgName ?? "");
  const [slugEdited, setSlugEdited] = useState(!!state.values?.slug);
  const [slug, setSlug] = useState(state.values?.slug ?? "");

  // Slug auto-gerado enquanto user não edita manualmente.
  const autoSlug = useMemo(() => slugifyOrgName(orgName), [orgName]);
  const finalSlug = slugEdited ? slug : autoSlug;

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="name" value={state.name} />
      <input type="hidden" name="email" value={state.email} />
      <input type="hidden" name="phone" value={state.phone} />
      <input type="hidden" name="passwordHash" value={state.passwordHash} />
      <input type="hidden" name="slug" value={finalSlug} />

      <div className="rounded-md border bg-muted/30 p-3 text-xs">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Quase lá, {state.name.split(" ")[0]}
        </div>
        <div className="text-sm">
          Falta nomear sua barbearia. Você pode mudar tudo depois.
        </div>
      </div>

      {state.error && !state.fieldErrors && (
        <ErrorAlert message={state.error} />
      )}

      <Field
        id="orgName"
        label="Nome da barbearia / salão"
        defaultValue={orgName}
        onChange={setOrgName}
        autoComplete="organization"
        required
        minLength={2}
        maxLength={60}
        placeholder="Ex: Salão do José"
        error={state.fieldErrors?.orgName}
        hint="Como aparece pros seus clientes."
      />

      <div className="space-y-1">
        <label htmlFor="slug-input" className="text-sm font-medium">
          Endereço público
        </label>
        <div
          className={cn(
            "flex items-center rounded-md border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring",
            state.fieldErrors?.slug ? "border-destructive" : "border-input",
          )}
        >
          <span className="select-none pl-3 font-mono text-xs text-muted-foreground">
            lustro.app/
          </span>
          <input
            id="slug-input"
            value={finalSlug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            minLength={3}
            maxLength={40}
            placeholder={autoSlug || "salao-do-jose"}
            className="w-full bg-transparent px-1 py-2 font-mono text-sm outline-none"
          />
        </div>
        {state.fieldErrors?.slug ? (
          <p className="text-xs text-destructive">{state.fieldErrors.slug}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            URL que você vai divulgar pros clientes agendarem.
          </p>
        )}
      </div>

      <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
        🎁 Você ganhou <strong>14 dias grátis</strong> pra testar tudo.
        Sem cartão, sem pegadinha.
      </div>

      <OrgSubmit />
    </form>
  );
}

function OrgSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Criando…
        </>
      ) : (
        <>
          <Store className="mr-2 h-4 w-4" />
          Criar minha barbearia
          <ArrowRight className="ml-2 h-4 w-4" />
        </>
      )}
    </Button>
  );
}

// ─── helpers ────────────────────────────────────────────────────────

function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  placeholder,
  autoComplete,
  required,
  minLength,
  maxLength,
  error,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  error?: string;
  hint?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        aria-invalid={!!error}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring",
          error ? "border-destructive" : "border-input",
        )}
      />
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
