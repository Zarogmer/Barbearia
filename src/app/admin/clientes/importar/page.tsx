import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

import { ImportCsvWizard } from "@/components/features/admin/ImportCsvWizard";
import { auth } from "@/lib/auth";

export default async function ImportarClientesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/clientes/importar");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Você precisa ser OWNER pra importar clientes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <Link
        href="/admin/clientes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-subtle hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para clientes
      </Link>

      <header>
        <div className="eyebrow mb-3">CRM</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Importar clientes (CSV)
        </h1>
        <p className="text-sm text-subtle">
          Cole o conteúdo de um arquivo .csv exportado do Excel / Google
          Sheets. Cada linha vira um cliente, vinculado à sua barbearia.
        </p>
      </header>

      <div className="rounded-md border border-line bg-surface p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
            <FileSpreadsheet className="h-4 w-4" />
          </span>
          <div>
            <div className="font-display text-sm font-bold">
              Formato esperado
            </div>
            <p className="text-xs text-subtle">
              Primeira linha = cabeçalho. Reconhece colunas{" "}
              <span className="mono">nome</span>,{" "}
              <span className="mono">email</span>,{" "}
              <span className="mono">telefone</span>,{" "}
              <span className="mono">aniversario</span> (variações em PT/EN
              aceitas). Só <span className="mono">nome</span> é obrigatório.
            </p>
            <pre className="mono mt-2 overflow-x-auto rounded-md border border-line bg-surface-2 p-3 text-[11px] text-subtle">
{`nome,email,telefone,aniversario
João Silva,joao@email.com,11999998888,1990-05-15
Maria Santos,,11888887777,
Pedro Costa,pedro@e.com,,`}
            </pre>
          </div>
        </div>

        <ImportCsvWizard />
      </div>
    </div>
  );
}
