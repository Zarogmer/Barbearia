import { Card } from "@/components/ui/card";
import { ORGS } from "@/lib/mock-data";

export default function SettingsPage() {
  const org = ORGS[0]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Dados básicos da organização.</p>
      </header>

      <Card className="p-6">
        <form className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Nome da barbearia
            </label>
            <input
              id="name"
              defaultValue={org.name}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="slug" className="mb-1 block text-sm font-medium">
              URL (slug)
            </label>
            <div className="flex h-11 items-center rounded-lg border bg-background pl-3 text-sm">
              <span className="text-muted-foreground">barbearia.app/</span>
              <input
                id="slug"
                defaultValue={org.slug}
                className="flex-1 bg-transparent px-1 outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Mudar isso muda a URL pública da sua barbearia.
            </p>
          </div>

          <div>
            <label htmlFor="address" className="mb-1 block text-sm font-medium">
              Endereço
            </label>
            <input
              id="address"
              defaultValue={org.address}
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="tz" className="mb-1 block text-sm font-medium">
              Fuso horário
            </label>
            <input
              id="tz"
              disabled
              value="America/Sao_Paulo"
              className="h-11 w-full rounded-lg border bg-muted px-3 text-sm text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Configurável em v2.</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
            <input type="checkbox" id="guest" className="mt-1 h-4 w-4" />
            <label htmlFor="guest" className="text-sm">
              <div className="font-medium">Permitir agendamento sem cadastro</div>
              <div className="text-muted-foreground">
                Cliente fornece nome e email mas não precisa criar senha. Útil para fluxo rápido.
              </div>
            </label>
          </div>

          <button
            type="button"
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Salvar alterações
          </button>
        </form>
      </Card>

      <p className="text-xs text-muted-foreground">
        Protótipo · Server Action de salvar em PBI-10 (D5).
      </p>
    </div>
  );
}
