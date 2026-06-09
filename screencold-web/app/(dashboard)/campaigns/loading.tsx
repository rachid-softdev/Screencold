export default function CampaignsLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-32 bg-neutral-200 rounded" />
        <div className="h-10 w-40 bg-neutral-200 rounded" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-neutral-200" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-neutral-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}