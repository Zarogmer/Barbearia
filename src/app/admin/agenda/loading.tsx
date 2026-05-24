import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaLoading() {
  return (
    <div className="flex h-full flex-col p-4 lg:p-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="flex-1 overflow-hidden rounded-md border border-line bg-surface">
        <div className="grid grid-cols-[64px_1fr_1fr] gap-0">
          <div className="border-r border-line">
            <Skeleton className="m-2 h-8 w-10" />
            {Array.from({ length: 11 }).map((_, i) => (
              <Skeleton key={i} className="m-2 h-3 w-10" />
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="space-y-2 border-r border-line p-2 last:border-r-0">
              <div className="mb-3 flex items-center gap-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
