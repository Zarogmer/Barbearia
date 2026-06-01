"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Loader2,
  Phone,
  Send,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { checkNumberAction, sendMessageAction } from "./actions";

type Template = {
  id: string;
  title: string;
  body: string;
  key: string | null;
};

type Props = {
  templates: Template[];
  orgName: string;
  orgAddress: string | null;
  connected: boolean;
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

export function SendMessagePanel({
  templates,
  orgName,
  orgAddress,
  connected,
}: Props) {
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [text, setText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [check, setCheck] = useState<
    { hasWhatsApp: boolean; phone: string } | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkPending, startCheck] = useTransition();
  const [sendPending, startSend] = useTransition();

  const previewText = useMemo(() => {
    if (!selectedTemplate) return text;
    const tpl = templates.find((t) => t.id === selectedTemplate);
    if (!tpl) return text;
    return renderTemplate(tpl.body, {
      nome: customerName.split(" ")[0],
      barbearia: orgName,
      endereco: orgAddress ?? undefined,
    });
  }, [selectedTemplate, templates, customerName, orgName, orgAddress, text]);

  const finalText = selectedTemplate ? previewText : text;

  function handleCheck() {
    if (!phone.trim()) {
      setError("Digite o telefone.");
      return;
    }
    setError(null);
    setCheck(null);
    startCheck(async () => {
      const r = await checkNumberAction(phone);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCheck({ hasWhatsApp: r.data.hasWhatsApp, phone: r.data.phone });
    });
  }

  function handleSend() {
    setError(null);
    setSuccess(null);
    if (!finalText.trim()) {
      setError("Mensagem vazia. Escolha um template ou digite texto.");
      return;
    }
    startSend(async () => {
      const r = await sendMessageAction(phone, finalText);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(`Mensagem enviada pra +${phone.replace(/\D/g, "")}`);
      setText("");
      setSelectedTemplate("");
      setCheck(null);
    });
  }

  if (!connected) {
    return (
      <div className="rounded-md border border-warn/30 bg-warn/5 p-5 text-sm text-warn">
        Conecte o WhatsApp primeiro (aba Conexão) pra enviar mensagens.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-line bg-surface p-5">
      <div>
        <div className="font-display text-base font-bold">Enviar mensagem</div>
        <p className="text-xs text-subtle">
          Avulso ou via template. Verifica se o número tem WhatsApp antes de mandar.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-ok/30 bg-ok/5 p-3 text-xs text-ok">
          <CheckCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            Telefone (com DDD) *
          </label>
          <div className="flex gap-2">
            <input
              id="phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setCheck(null);
              }}
              placeholder="+5511999998888"
              className="mono h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
            />
            <button
              type="button"
              onClick={handleCheck}
              disabled={checkPending || !phone.trim()}
              className={cn(
                "tap inline-flex h-11 items-center gap-1.5 rounded-md border border-line bg-surface px-3 text-xs font-semibold transition-colors hover:border-brand",
                (checkPending || !phone.trim()) && "cursor-not-allowed opacity-50",
              )}
            >
              {checkPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              Verificar
            </button>
          </div>
          {check && (
            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 mono text-[11px]",
                check.hasWhatsApp ? "text-ok" : "text-danger",
              )}
            >
              {check.hasWhatsApp ? (
                <>
                  <Check className="h-3 w-3" /> +{check.phone} tem WhatsApp
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" /> +{check.phone} não tem
                  WhatsApp
                </>
              )}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="customerName"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            Nome (pra templates com {"{nome}"})
          </label>
          <input
            id="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="João Silva"
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
          />
        </div>
      </div>

      {templates.length > 0 && (
        <div>
          <label
            htmlFor="tpl"
            className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
          >
            Template (opcional)
          </label>
          <select
            id="tpl"
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand focus:shadow-glow"
          >
            <option value="">— Escrever do zero</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.key ? ` (${t.key})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="text"
          className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
        >
          {selectedTemplate ? "Preview (editável)" : "Mensagem *"}
        </label>
        <textarea
          id="text"
          value={selectedTemplate ? previewText : text}
          onChange={(e) => {
            setText(e.target.value);
            if (selectedTemplate) setSelectedTemplate("");
          }}
          rows={6}
          maxLength={2000}
          placeholder="Digite a mensagem..."
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand focus:shadow-glow"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={sendPending || !phone.trim() || !finalText.trim()}
          className={cn(
            "tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-ok px-4 text-sm font-semibold text-white shadow-sm transition-all",
            sendPending || !phone.trim() || !finalText.trim()
              ? "cursor-not-allowed opacity-60"
              : "hover:-translate-y-px hover:shadow-lg",
          )}
        >
          {sendPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Enviar pela API
        </button>
        {phone.trim() && finalText.trim() && (
          <a
            href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(finalText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold text-subtle transition-colors hover:border-brand hover:text-brand"
          >
            <Phone className="h-4 w-4" />
            Abrir no WhatsApp Web
          </a>
        )}
      </div>
    </div>
  );
}
