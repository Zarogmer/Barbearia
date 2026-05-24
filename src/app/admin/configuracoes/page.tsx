import { ORGS } from "@/lib/mock-data";

export default function SettingsPage() {
  const org = ORGS[0]!;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 lg:p-8">
      <header>
        <div className="eyebrow mb-3">Organização</div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">
          Configurações
        </h1>
        <p className="text-sm text-subtle">Dados básicos da organização.</p>
      </header>

      <div className="rounded-md border border-line bg-surface p-6">
        <form className="space-y-5">
          <Field
            id="name"
            label="Nome da barbearia"
            defaultValue={org.name}
          />

          <div>
            <label
              htmlFor="slug"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              URL (slug)
            </label>
            <div className="flex h-11 items-center rounded-lg border border-line bg-surface pl-3 text-sm transition-all focus-within:border-brand focus-within:shadow-[0_0_0_4px_hsl(var(--brand)/0.18)]">
              <span className="mono text-subtle">barbearia.app/</span>
              <input
                id="slug"
                defaultValue={org.slug}
                className="flex-1 bg-transparent px-1 outline-none mono"
              />
            </div>
            <p className="mt-1.5 text-xs text-subtle">
              Mudar isso muda a URL pública da sua barbearia.
            </p>
          </div>

          <Field id="address" label="Endereço" defaultValue={org.address} />

          <div>
            <label
              htmlFor="tz"
              className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
            >
              Fuso horário
            </label>
            <input
              id="tz"
              disabled
              value="America/Sao_Paulo"
              className="mono h-11 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-subtle"
            />
            <p className="mt-1.5 text-xs text-subtle">Configurável em v2.</p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-2 p-3">
            <input
              type="checkbox"
              id="guest"
              className="mt-1 h-4 w-4 accent-[hsl(var(--brand))]"
            />
            <label htmlFor="guest" className="text-sm">
              <div className="font-semibold">Permitir agendamento sem cadastro</div>
              <div className="text-xs text-subtle">
                Cliente fornece nome e email mas não precisa criar senha. Útil para fluxo rápido.
              </div>
            </label>
          </div>

          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-fg shadow-sm transition-all hover:-translate-y-px hover:shadow-lg active:translate-y-0"
          >
            Salvar alterações
          </button>
        </form>
      </div>

      <p className="mono text-[10px] uppercase tracking-wider text-subtle">
        Protótipo · Server Action de salvar em PBI-10 (D5)
      </p>
    </div>
  );
}

function Field({
  id,
  label,
  defaultValue,
}: {
  id: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block mono text-[10px] font-semibold uppercase tracking-wider text-subtle"
      >
        {label}
      </label>
      <input
        id={id}
        defaultValue={defaultValue}
        className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none transition-all focus:border-brand focus:shadow-[0_0_0_4px_hsl(var(--brand)/0.18)]"
      />
    </div>
  );
}
