export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Credit counter skeleton */}
      <div className="h-24 rounded-xl bg-gray-200" />

      {/* Quick audit form skeleton */}
      <div className="h-48 rounded-xl bg-gray-200" />

      {/* Stats cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-200" />
        ))}
      </div>

      {/* Recent audits skeleton */}
      <div className="h-64 rounded-xl bg-gray-200" />
    </div>
  );
}