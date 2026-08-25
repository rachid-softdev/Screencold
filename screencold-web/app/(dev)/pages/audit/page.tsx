import { notFound } from "next/navigation";
import { DevBadge } from "@/components/dev/DevBadge";

const mockIssues = [
  {
    severity: "critical",
    title: "Missing meta description",
    description: "No meta description tag found. Expected 120-160 characters.",
  },
  {
    severity: "high",
    title: "Slow Largest Contentful Paint (LCP)",
    description: "LCP is 4.2s. Target: under 2.5s.",
  },
  {
    severity: "medium",
    title: "No alt text on 3 images",
    description: "Images missing alt attributes reduce accessibility.",
  },
  {
    severity: "low",
    title: "Font loading blocks render",
    description: "Consider using font-display: swap or preload.",
  },
];

const severityStyles: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 ring-red-500/30",
  high: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
  low: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
};

const mockAnnotatedAreas = [
  { label: "Missing title tag", x: "10%", y: "5%", color: "#ef4444" },
  { label: "No CTA above fold", x: "45%", y: "30%", color: "#f97316" },
  { label: "Low contrast text", x: "70%", y: "55%", color: "#eab308" },
  { label: "Slow hero image", x: "30%", y: "65%", color: "#3b82f6" },
];

export default function AuditPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <DevBadge label="AUDIT PREVIEW" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Audit Result Preview
        </h1>
        <p className="mt-2 text-gray-400">
          Mock audit output showing score, annotated screenshot, and issue
          breakdown.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-6 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Conversion Score
          </p>
          <div className="relative inline-flex items-center justify-center">
            <svg className="h-28 w-28" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#1f2937"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#2563eb"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="264"
                strokeDashoffset="105"
                className="origin-center -rotate-90"
              />
            </svg>
            <span className="absolute text-2xl font-bold text-white">60</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">/ 100</p>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-[#1f2937] bg-[#111827] p-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Issue Summary
          </p>
          <div className="space-y-3">
            {mockIssues.map((issue) => (
              <div key={issue.title} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${severityStyles[issue.severity] ?? ""}`}
                >
                  {issue.severity}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{issue.title}</p>
                  <p className="text-xs text-gray-400">{issue.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#1f2937] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Annotated Screenshot
          </span>
        </div>
        <div className="relative bg-[#0B1120] aspect-video">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg border border-[#1f2937] bg-[#111827]/80 w-3/4 h-3/4 flex flex-col p-6 gap-3">
              <div className="h-4 w-1/3 rounded bg-[#1f2937]" />
              <div className="h-3 w-1/2 rounded bg-[#1f2937]/60" />
              <div className="flex-1 rounded bg-[#1f2937]/30" />
              <div className="flex gap-3">
                <div className="h-8 w-24 rounded bg-[#2563eb]/30" />
                <div className="h-8 w-24 rounded bg-[#1f2937]" />
              </div>
            </div>
          </div>

          {mockAnnotatedAreas.map((area, i) => (
            <div
              key={area.label}
              className="absolute flex items-center gap-1.5"
              style={{ left: area.x, top: area.y }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: area.color }}
              >
                {i + 1}
              </span>
              <span className="rounded bg-black/70 px-2 py-0.5 text-[10px] text-white whitespace-nowrap">
                {area.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
