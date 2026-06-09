export default function AuditsLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite">
      {/* Header skeleton */}
      <div className="h-8 w-48 bg-neutral-200 rounded" />

      {/* Filters skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-32 bg-neutral-200 rounded" />
        <div className="h-10 w-32 bg-neutral-200 rounded" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-neutral-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}