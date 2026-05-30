export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="h-3 w-24 rounded bg-surface-3" />
        <div className="h-8 w-24 rounded bg-surface-3" />
        <div className="h-3 w-40 rounded bg-surface-3" />
      </header>

      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <article
            key={i}
            className="overflow-hidden rounded-md border border-line bg-surface"
          >
            <div className="aspect-square bg-surface-3 animate-pulse" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-full rounded bg-surface-3 animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-surface-3 animate-pulse" />
            </div>
            <div className="border-t border-line px-4 py-2">
              <div className="h-2 w-24 rounded bg-surface-3 animate-pulse" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
