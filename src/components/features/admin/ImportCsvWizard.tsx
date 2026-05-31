"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { importCustomersAction } from "@/app/admin/clientes/importar/actions";
import { detectColumns, parseCsv, type CsvParseResult } from "@/lib/csv-parse";
import type { ImportResult } from "@/lib/server/customer-import";
import { cn } from "@/lib/utils";

type Step = "input" | "preview" | "done";

export function ImportCsvWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<CsvParseResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Pattern guide §2: useMemo aqui agrega ~N linhas (pode ser 1000+)
  const detected = useMemo(
    () => (parsed ? detectColumns(parsed.headers) : null),
    [parsed],
  );

  function handleParse() {
    setError(null);
    if (!text.trim()) {
      setError("Cole o conteúdo do CSV antes de continuar.");
      return;
    }
    const p = parseCsv(text);
    if (p.rows.length === 0) {
      setError("CSV sem linhas de dados.");
      return;
    }
    setParsed(p);
    setStep("preview");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => setText(t));
  }

  function handleImport() {
    if (!parsed || !detected) return;
    setError(null);
    startTransition(async () => {
      const rows = parsed.rows.map((r) => ({
        name: detected.name ? r[detected.name] : "",
        email: detected.email ? r[detected.email] : "",
        phone: detected.phone ? r[detected.phone] : "",
        birthDate: detected.birthDate ? r[detected.birthDate] : "",
      }));
      const res = await importCustomersAction({ rows });
      if (res.ok) {
        setResult(res.result);
        setStep("done");
      } else {
        setError(res.error);
      }
    });
  }

  function handleReset() {
    setText("");
    setParsed(null);
    setResult(null);
    setError(null);
    setStep("input");
  }

  if (step === "done" && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-ok/30 bg-ok/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
          <div className="flex-1">
            <div className="font-display text-sm font-bold text-ok">
              Importação concluída
            </div>
            <div className="mt-1 mono text-xs text-subtle">
              {result.created} novo{result.created !== 1 ? "s" : ""} ·{" "}
              {result.matched} já existi
              {result.matched !== 1 ? "am" : "a"} (atualizado) ·{" "}
              {result.failed.length} falha{result.failed.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {result.failed.length > 0 && (
          <div className="rounded-md border border-warn/30 bg-warn/5 p-3">
            <div className="mb-1 mono text-[10px] font-semibold uppercase tracking-wider text-warn">
              Linhas com problema
            </div>
            <ul className="mono space-y-0.5 text-[11px]">
              {result.failed.slice(0, 10).map((f) => (
                <li key={f.row}>
                  Linha {f.row}: {f.reason}
                </li>
              ))}
              {result.failed.length > 10 && (
                <li className="text-subtle">…e mais {result.failed.length - 10}</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin/clientes")}
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-semibold text-surface"
          >
            Ver clientes
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
          >
            Importar outro
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview" && parsed && detected) {
    const missingName = !detected.name;
    return (
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {missingName && (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            Coluna <span className="mono font-bold">nome</span> não encontrada.
            Renomeie no CSV pra <span className="mono">nome</span> (ou
            <span className="mono"> name</span>) e tente de novo.
          </div>
        )}

        <div className="rounded-md border border-line bg-surface-2 p-3">
          <div className="mb-2 mono text-[10px] font-semibold uppercase tracking-wider text-subtle">
            Mapeamento detectado ({parsed.rows.length} linha
            {parsed.rows.length !== 1 ? "s" : ""}, delimitador{" "}
            <span className="mono">{parsed.delimiter}</span>)
          </div>
          <ul className="space-y-0.5 text-xs">
            <MapRow label="Nome" found={detected.name} required />
            <MapRow label="Email" found={detected.email} />
            <MapRow label="Telefone" found={detected.phone} />
            <MapRow label="Aniversário" found={detected.birthDate} />
          </ul>
        </div>

        {parsed.errors.length > 0 && (
          <div className="rounded-md border border-warn/30 bg-warn/5 p-3 text-xs">
            <div className="mb-1 mono text-[10px] font-semibold uppercase tracking-wider text-warn">
              {parsed.errors.length} linha
              {parsed.errors.length !== 1 ? "s" : ""} com problema de formato
              (serão puladas)
            </div>
            <ul className="mono space-y-0.5 text-[11px]">
              {parsed.errors.slice(0, 5).map((e, i) => (
                <li key={i}>
                  Linha {e.line}: {e.message}
                </li>
              ))}
              {parsed.errors.length > 5 && (
                <li>…e mais {parsed.errors.length - 5}</li>
              )}
            </ul>
          </div>
        )}

        {/* Preview tabela top 5 */}
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <div className="border-b border-line bg-surface-2 px-3 py-2 mono text-[10px] uppercase tracking-wider text-subtle">
            Preview (5 primeiras)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-2/40 text-left">
                  {parsed.headers.map((h) => (
                    <th
                      key={h}
                      className="mono px-3 py-2 text-[10px] uppercase tracking-wider text-subtle"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.slice(0, 5).map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    {parsed.headers.map((h) => (
                      <td key={h} className="truncate px-3 py-2">
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="tap inline-flex h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-sm font-semibold hover:bg-surface-2"
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending || missingName}
            className={cn(
              "tap inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-all",
              !missingName && !isPending
                ? "bg-brand text-brand-fg shadow-sm hover:-translate-y-px hover:shadow-md"
                : "cursor-not-allowed bg-surface-2 text-subtle",
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Importando…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Importar {parsed.rows.length} cliente
                {parsed.rows.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <label className="tap flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface-2/40 text-sm text-subtle transition-colors hover:border-brand hover:bg-brand-soft/30 hover:text-brand">
        <Upload className="h-4 w-4" />
        Escolher arquivo .csv
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>

      <div className="text-center mono text-[10px] uppercase tracking-wider text-subtle">
        ou cole o conteúdo
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="nome,email,telefone,aniversario&#10;João Silva,joao@email.com,11999998888,1990-05-15"
        className="mono w-full rounded-md border border-line bg-surface px-3 py-2 text-xs outline-none focus:border-brand focus:shadow-glow"
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleParse}
          className="tap inline-flex h-10 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-semibold text-surface hover:-translate-y-px hover:shadow-md"
        >
          Pré-visualizar
        </button>
      </div>
    </div>
  );
}

function MapRow({
  label,
  found,
  required,
}: {
  label: string;
  found: string | null;
  required?: boolean;
}) {
  return (
    <li className="flex items-center justify-between">
      <span>
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {found ? (
        <span className="mono inline-flex items-center gap-1 text-[11px] text-ok">
          <Check className="h-3 w-3" />
          coluna <span className="mono">{found}</span>
        </span>
      ) : (
        <span className="mono inline-flex items-center gap-1 text-[11px] text-subtle">
          <X className="h-3 w-3" />
          não encontrada
        </span>
      )}
    </li>
  );
}
