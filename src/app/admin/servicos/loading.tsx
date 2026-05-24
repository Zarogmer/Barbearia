import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Skeleton className="mb-3 h-5 w-24" />
          <Skeleton className="mb-2 h-9 w-44" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-36" />
      </header>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="hidden border-b border-line bg-surface-2 px-5 py-3 sm:block">
          <Skeleton className="h-3 w-full" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_120px_140px_80px_80px] items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <div>
              <Skeleton className="mb-1.5 h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <div className="flex -space-x-2">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
