import { Skeleton } from "@/components/ui/skeleton";

export default function ProfessionalsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-8">
      <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <Skeleton className="mb-3 h-5 w-20" />
          <Skeleton className="mb-2 h-9 w-52" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-44" />
      </header>

      <div className="overflow-hidden rounded-md border border-line bg-surface">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="grid grid-cols-[1fr_1.4fr_1.6fr_100px_120px] items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1.5 h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
            <div className="flex justify-end gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
