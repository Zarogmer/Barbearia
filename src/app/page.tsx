import Link from "next/link";
import { Scissors, LayoutDashboard } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Scissors className="h-8 w-8" />
      </div>

      <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Barbearia SaaS</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        Protótipo navegável do sistema de agendamento. Explore os dois fluxos abaixo.
      </p>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Link href="/barbearia-demo" className="block">
          <div className="group h-full rounded-xl border bg-card p-6 text-left shadow-sm transition-all hover:border-primary hover:shadow-md">
            <Scissors className="mb-3 h-6 w-6 text-primary" />
            <h2 className="mb-1 font-semibold">Fluxo do cliente</h2>
            <p className="text-sm text-muted-foreground">
              Veja como um cliente agenda um corte em 4 passos.
            </p>
            <span className="mt-3 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
              Acessar barbearia demo →
            </span>
          </div>
        </Link>

        <Link href="/admin/dashboard" className="block">
          <div className="group h-full rounded-xl border bg-card p-6 text-left shadow-sm transition-all hover:border-primary hover:shadow-md">
            <LayoutDashboard className="mb-3 h-6 w-6 text-primary" />
            <h2 className="mb-1 font-semibold">Painel admin</h2>
            <p className="text-sm text-muted-foreground">
              Visão do dono da barbearia: agenda, serviços, profissionais.
            </p>
            <span className="mt-3 inline-flex items-center text-sm font-medium text-primary group-hover:underline">
              Entrar no painel →
            </span>
          </div>
        </Link>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        D1 do MVP · dados mockados · veja a pasta <code className="rounded bg-muted px-1.5 py-0.5">docs/</code>
      </p>
    </main>
  );
}
