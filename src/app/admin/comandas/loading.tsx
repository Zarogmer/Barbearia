export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <div className="h-3 w-12 rounded bg-surface-3" />
          <div className="h-8 w-44 rounded bg-surface-3" />
          <div className="h-3 w-32 rounded bg-surface-3" />
        </div>
        <div className="h-10 w-36 rounded-md bg-surface-3" />
      </header>

      <div className="flex gap-2 rounded-lg border border-line bg-surface-2 p-1 w-fit">
        <div className="h-7 w-20 rounded-md bg-surface-3" />
        <div className="h-7 w-20 rounded-md bg-surface-3/70" />
        <div className="h-7 w-16 rounded-md bg-surface-3/70" />
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="divide-y divide-line">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 px-5 py-3 md:grid md:grid-cols-[1fr_1fr_120px_140px_100px] md:items-center md:gap-4"
            >
              <div className="h-4 w-32 rounded bg-surface-3 animate-pulse" />
              <div className="h-3 w-24 rounded bg-surface-3 animate-pulse" />
              <div className="h-3 w-16 rounded bg-surface-3 animate-pulse" />
              <div className="h-4 w-20 rounded bg-surface-3 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-surface-3 animate-pulse md:justify-self-end" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
