export function DevBadge({ label = "DEV" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2563eb]/15 px-3 py-1 text-xs font-semibold tracking-wide text-[#60a5fa] ring-1 ring-[#2563eb]/30">
      <span className="h-1.5 w-1.5 rounded-full bg-[#2563eb] animate-pulse" />
      {label}
    </span>
  );
}
