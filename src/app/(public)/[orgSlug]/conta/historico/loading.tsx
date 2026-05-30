export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="h-3 w-16 rounded bg-surface-3" />
        <div className="h-8 w-36 rounded bg-surface-3" />
        <div className="h-3 w-44 rounded bg-surface-3" />
      </header>

      {/* Próximo agendamento (card destacado) */}
      <section>
        <div className="mb-3 h-3 w-32 rounded bg-surface-3" />
        <div className="rounded-md border border-brand/20 bg-brand-soft/40 p-4 animate-pulse">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="h-5 w-40 rounded bg-surface-3" />
            <div className="h-3 w-20 rounded bg-surface-3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="h-2 w-12 rounded bg-surface-3" />
              <div className="h-4 w-24 rounded bg-surface-3" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-16 rounded bg-surface-3" />
              <div className="h-4 w-20 rounded bg-surface-3" />
            </div>
          </div>
        </div>
      </section>

      {/* Mês passado */}
      <section>
        <div className="mb-3 h-3 w-24 rounded bg-surface-3" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-md border border-line bg-surface p-4 animate-pulse"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="h-4 w-32 rounded bg-surface-3" />
                <div className="h-5 w-20 rounded-full bg-surface-3" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <div className="h-2 w-12 rounded bg-surface-3" />
                  <div className="h-3 w-20 rounded bg-surface-3" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 w-16 rounded bg-surface-3" />
                  <div className="h-3 w-24 rounded bg-surface-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
