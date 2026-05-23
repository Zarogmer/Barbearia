import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, CheckCircle2, MapPin } from "lucide-react";

import { Card } from "@/components/ui/card";
import { getOrgBySlug } from "@/lib/mock-data";

export default async function BookingConfirmedPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const org = getOrgBySlug(orgSlug);

  if (!org) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12 text-center sm:max-w-2xl">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
      </div>

      <h1 className="mb-2 text-2xl font-bold">Agendamento confirmado!</h1>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Você vai receber um email com os detalhes em alguns minutos.
        <br />
        <span className="text-xs">(protótipo · email mock não envia)</span>
      </p>

      <Card className="mb-6 w-full p-5 text-left">
        <div className="mb-3 flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <div className="font-medium">Próximo agendamento</div>
            <div className="text-sm text-muted-foreground">
              {org.name} · código <code className="rounded bg-muted px-1.5 py-0.5">{id}</code>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">{org.address}</div>
        </div>
      </Card>

      <div className="flex w-full flex-col gap-2">
        <button className="h-11 rounded-lg border bg-background text-sm font-medium transition hover:bg-accent">
          Adicionar à agenda (.ics)
        </button>
        <button className="h-11 rounded-lg border border-destructive/30 bg-background text-sm font-medium text-destructive transition hover:bg-destructive/10">
          Cancelar agendamento
        </button>
        <Link
          href={`/${orgSlug}`}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Voltar para a barbearia
        </Link>
      </div>
    </main>
  );
}
