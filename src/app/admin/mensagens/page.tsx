import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { CustomersIllustration } from "@/components/ui/empty-state-illustrations";
import { auth } from "@/lib/auth";
import { listMessageTemplates } from "@/lib/server/messages";

import { ImportDefaultsButton } from "./ImportDefaultsButton";
import { TemplateCard } from "./TemplateCard";
import { TemplateFormDialog } from "./TemplateFormDialog";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?next=/admin/mensagens");

  const owner = session.user.memberships.find((m) => m.role === "OWNER");
  if (!owner) {
    return (
      <div className="mx-auto max-w-3xl p-4 lg:p-8">
        <p className="rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          Apenas OWNER pode gerenciar templates.
        </p>
      </div>
    );
  }

  const templates = await listMessageTemplates(owner.organizationId);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">CRM</div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
            Mensagens prontas
          </h1>
          <p className="text-sm text-subtle">
            Textos pré-definidos pra mandar via WhatsApp em 1 clique. Usa
            placeholders: <span className="mono">{"{nome}, {data}, {hora}, {servico}, {profissional}, {barbearia}, {endereco}"}</span>
          </p>
        </div>
        <TemplateFormDialog mode="create" />
      </header>

      {templates.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={<CustomersIllustration />}
            title="Nenhum template ainda"
            description="Crie do zero ou importe os 5 exemplos prontos (Confirmação, Lembrete 24h, Aniversário, Sumido, Endereço)."
            cta={null}
          />
          <div className="text-center">
            <ImportDefaultsButton />
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {templates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
          <p className="text-center text-[11px] text-subtle">
            <MessageCircle className="inline h-3 w-3" /> Envio: clica em
            &quot;Enviar&quot; na ficha do cliente, escolhe template, abre
            WhatsApp web.
          </p>
        </>
      )}
    </div>
  );
}
