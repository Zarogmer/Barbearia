"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, MessageCircle, RotateCcw } from "lucide-react";

import { saveReminderTemplateAction } from "@/app/admin/configuracoes/reminder-template-action";
import {
  DEFAULT_REMINDER_TEMPLATE,
  REMINDER_PLACEHOLDERS,
  renderReminder,
} from "@/lib/reminder-template";
import { cn } from "@/lib/utils";

type Props = {
  initial: string | null;
  orgName: string;
};

const SAMPLE_VARS = {
  nome: "João",
  servico: "Corte",
  profissional: "Pedro",
  data: "sex, 02 jun",
  hora: "14:30",
};

export function ReminderTemplateEditor({ initial, orgName }: Props) {
  const [value, setValue] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // useMemo aqui faz sentido — renderReminder roda toda render (3 a cada
  // keystroke). Lista pequena mas é o pattern certo per guide §2.
  const preview = useMemo(
    () =>
      renderReminder(value || null, {
        ...SAMPLE_VARS,
        barbearia: orgName || "Sua Barbearia",
      }),
    [value, orgName],
  );

  const dirty = (initial ?? "") !== value;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const r = await saveReminderTemplateAction({ template: value });
      if (r.ok) setSavedAt(Date.now());
      else setError(r.error);
    });
  }

  function handleReset() {
    setValue("");
    setSavedAt(null);
    setError(null);
  }

  function insertPlaceholder(key: string) {
    setValue((v) => (v || "") + key);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 inline-flex items-center gap-2 font-display text-base font-bold">
          <MessageCircle className="h-4 w-4 text-brand" />
          Mensagem do lembrete
        </h3>
        <p className="text-xs text-subtle">
          Texto enviado 24h antes do agendamento via WhatsApp. Use os
          placeholders pra personalizar com nome, serviço, etc.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Placeholders disponíveis */}
      <div>
        <div className="mb-1.5 mono text-[10px] uppercase tracking-wider text-subtle">
          Placeholders disponíveis (clique pra inserir)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {REMINDER_PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => insertPlaceholder(p.key)}
              className="tap inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 mono text-[10px] text-subtle transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
              title={`Ex: ${p.example}`}
            >
              {p.key}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="reminderTemplate"
          className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
        >
          Template (vazio = padrão Lustro)
        </label>
        <textarea
          id="reminderTemplate"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSavedAt(null);
          }}
          rows={4}
          maxLength={500}
          placeholder={DEFAULT_REMINDER_TEMPLATE}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-all focus:border-brand focus:shadow-glow"
        />
        <div className="mono mt-1 text-[10px] text-subtle">
          {value.length}/500
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-md border border-ok/30 bg-ok/5 p-3">
        <div className="mb-1 mono text-[10px] uppercase tracking-wider text-ok">
          Preview com dados de exemplo
        </div>
        <p className="text-sm leading-snug">{preview}</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleReset}
          disabled={isPending}
          className="tap inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold text-subtle transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Voltar ao padrão
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || isPending}
          className={cn(
            "tap inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-all",
            dirty && !isPending
              ? "bg-ink text-surface shadow-sm hover:-translate-y-px hover:shadow-md"
              : "cursor-not-allowed bg-surface-2 text-subtle",
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando…
            </>
          ) : savedAt ? (
            <>
              <Check className="h-4 w-4" />
              Salvo
            </>
          ) : (
            "Salvar template"
          )}
        </button>
      </div>
    </div>
  );
}
