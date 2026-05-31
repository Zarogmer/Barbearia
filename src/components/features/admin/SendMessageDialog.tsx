"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MessageCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  title: string;
  body: string;
  key: string | null;
};

type Props = {
  templates: Template[];
  customer: {
    name: string;
    phone: string | null;
  };
  vars?: {
    data?: string;
    hora?: string;
    servico?: string;
    profissional?: string;
    barbearia?: string;
    endereco?: string;
  };
  triggerLabel?: string;
  triggerVariant?: "primary" | "secondary";
};

function renderTemplate(
  body: string,
  vars: Record<string, string | undefined>,
): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    return v && v.trim().length > 0 ? v : "—";
  });
}

function buildWhatsappLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export function SendMessageDialog({
  templates,
  customer,
  vars = {},
  triggerLabel = "Enviar mensagem",
  triggerVariant = "secondary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? "");
  const [customText, setCustomText] = useState("");

  const selected = templates.find((t) => t.id === selectedId);

  const renderVars = useMemo(
    () => ({
      nome: customer.name,
      data: vars.data,
      hora: vars.hora,
      servico: vars.servico,
      profissional: vars.profissional,
      barbearia: vars.barbearia,
      endereco: vars.endereco,
      whatsapp: customer.phone ?? undefined,
    }),
    [customer, vars],
  );

  // Texto final: se user editou, usa o editado. Senão, render do template.
  const text = customText.length > 0
    ? customText
    : selected
      ? renderTemplate(selected.body, renderVars)
      : "";

  const waLink = customer.phone ? buildWhatsappLink(customer.phone, text) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setCustomText("");
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "tap inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-all",
            triggerVariant === "primary"
              ? "bg-ok text-white shadow-sm hover:-translate-y-px hover:shadow-lg"
              : "border border-line bg-surface hover:border-brand hover:bg-brand-soft",
          )}
        >
          <MessageCircle className="h-4 w-4" />
          {triggerLabel}
        </button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-line px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-lg font-bold">
            Enviar mensagem
          </DialogTitle>
          <DialogDescription className="text-xs text-subtle">
            Pra {customer.name}
            {customer.phone ? ` · ${customer.phone}` : " (sem telefone)"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3.5 overflow-y-auto px-6 py-4">
          {templates.length === 0 ? (
            <p className="rounded-md border border-warn/30 bg-warn/5 p-3 text-xs text-warn">
              Nenhum template cadastrado. Vá em{" "}
              <Link
                href="/admin/mensagens"
                className="underline font-semibold"
              >
                /admin/mensagens
              </Link>{" "}
              pra criar.
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="template-select"
                  className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
                >
                  Template
                </label>
                <select
                  id="template-select"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setCustomText("");
                  }}
                  className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                      {t.key ? ` (${t.key})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="preview"
                  className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
                >
                  Preview (editável)
                </label>
                <textarea
                  id="preview"
                  value={text}
                  onChange={(e) => setCustomText(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:shadow-glow"
                />
                <p className="mt-1 text-[10px] text-subtle">
                  Edite à vontade — só será enviado isso. Placeholders sem
                  dado viram &quot;—&quot;.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-line bg-surface px-6 py-3 sm:gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 rounded-lg border border-line bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-2"
          >
            Cancelar
          </button>
          {waLink ? (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-ok px-4 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          ) : (
            <span className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-surface-2 px-4 text-sm font-semibold text-subtle">
              sem telefone
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
