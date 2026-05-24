import { Skeleton } from "@/components/ui/skeleton";

export default function OrgLandingLoading() {
  return (
    <main className="mx-auto max-w-md px-5 py-5 sm:max-w-2xl">
      <section className="mb-6 overflow-hidden rounded-xl bg-ink p-6">
        <Skeleton className="mb-3 h-3 w-40 bg-white/10" />
        <Skeleton className="mb-2 h-8 w-3/4 bg-white/10" />
        <Skeleton className="h-3 w-1/2 bg-white/10" />
      </section>

      <Skeleton className="mb-8 h-12 w-full" />

      <section className="mb-8">
        <Skeleton className="mb-3 h-3 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-line p-4">
              <div>
                <Skeleton className="mb-1.5 h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      </section>

      <section>
        <Skeleton className="mb-3 h-3 w-24" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center rounded-md border border-line p-4">
              <Skeleton className="mb-2 h-14 w-14 rounded-full" />
              <Skeleton className="mb-1 h-3 w-16" />
              <Skeleton className="h-2.5 w-20" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
