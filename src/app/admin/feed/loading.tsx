export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-surface-3" />
          <div className="h-8 w-24 rounded bg-surface-3" />
          <div className="h-3 w-44 rounded bg-surface-3" />
        </div>
        <div className="h-10 w-32 rounded-md bg-surface-3" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-md border border-line bg-surface"
          >
            <div className="aspect-square bg-surface-3 animate-pulse" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-full rounded bg-surface-3 animate-pulse" />
              <div className="flex items-center justify-between gap-2">
                <div className="h-2 w-16 rounded bg-surface-3 animate-pulse" />
                <div className="h-5 w-12 rounded-md bg-surface-3 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
