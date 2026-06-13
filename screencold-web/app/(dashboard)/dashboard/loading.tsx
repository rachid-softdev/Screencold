export default function DashboardLoading() {
  return (
    <div className="space-y-8" role="status" aria-live="polite">
      {/* Credit counter skeleton */}
      <div className="animate-pulse rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-neutral-200" />
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-neutral-200" />
            <div className="h-8 w-20 rounded bg-neutral-200" />
          </div>
        </div>
      </div>

      {/* Quick audit form skeleton */}
      <div className="animate-pulse rounded-xl bg-info-600 p-6 sm:p-8">
        <div className="mx-auto max-w-md space-y-4 text-center">
          <div className="mx-auto h-6 w-72 rounded bg-white/20" />
          <div className="mx-auto h-4 w-56 rounded bg-white/20" />
        </div>
        <div className="mx-auto mt-8 flex max-w-lg gap-3">
          <div className="h-12 flex-1 rounded-lg bg-white/20" />
          <div className="h-12 w-28 rounded-lg bg-white/20" />
        </div>
      </div>

      {/* Stats cards skeleton */}
      <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-4 w-28 rounded bg-neutral-200" />
                <div className="h-8 w-16 rounded bg-neutral-200" />
                <div className="h-3 w-20 rounded bg-neutral-200" />
              </div>
              <div className="h-10 w-10 rounded-lg bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent audits skeleton */}
      <div className="animate-pulse rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-6 py-4">
          <div className="h-5 w-32 rounded bg-neutral-200" />
        </div>
        <div className="divide-y divide-neutral-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-12 w-20 flex-shrink-0 rounded-lg bg-neutral-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-neutral-200" />
                <div className="h-3 w-24 rounded bg-neutral-200" />
              </div>
              <div className="h-6 w-16 rounded-full bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}