import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="mb-3 h-5 w-32" />
          <Skeleton className="mb-2 h-9 w-72" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-48" />
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-line bg-surface p-4">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="mb-3 h-9 w-20" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <Skeleton className="mt-2 h-2.5 w-32" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        <div className="border-b border-line bg-surface-2 px-4 py-3">
          <Skeleton className="h-4 w-44" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[80px_1fr_1fr_160px_100px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <Skeleton className="h-3 w-12" />
            <div>
              <Skeleton className="mb-1.5 h-4 w-32" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <div>
              <Skeleton className="mb-1.5 h-4 w-24" />
              <Skeleton className="h-2.5 w-28" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
