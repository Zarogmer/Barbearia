export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="space-y-2">
        <div className="h-3 w-12 rounded bg-surface-3" />
        <div className="h-8 w-44 rounded bg-surface-3" />
        <div className="h-3 w-40 rounded bg-surface-3" />
      </header>

      <div className="h-11 w-full rounded-md bg-surface-3 animate-pulse" />

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="divide-y divide-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-5 py-4 md:grid md:grid-cols-[1fr_1fr_140px_120px_24px]"
            >
              <div className="h-4 w-36 rounded bg-surface-3 animate-pulse" />
              <div className="h-3 w-32 rounded bg-surface-3 animate-pulse hidden md:block" />
              <div className="h-3 w-20 rounded bg-surface-3 animate-pulse hidden md:block" />
              <div className="h-3 w-16 rounded bg-surface-3 animate-pulse hidden md:block" />
              <div className="h-3 w-3 rounded bg-surface-3 animate-pulse hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
