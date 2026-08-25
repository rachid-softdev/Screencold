import { notFound } from "next/navigation";
import { DevBadge } from "@/components/dev/DevBadge";

const palette = [
  { name: "Primary", hex: "#2563eb", tw: "info-600" },
  { name: "Primary Light", hex: "#60a5fa", tw: "info-400" },
  { name: "Primary Dark", hex: "#1d4ed8", tw: "info-700" },
  { name: "Secondary", hex: "#7c3aed", tw: "secondary-600" },
  { name: "Background", hex: "#0B1120", tw: "custom" },
  { name: "Surface", hex: "#111827", tw: "neutral-900" },
  { name: "Text", hex: "#f9fafb", tw: "neutral-50" },
  { name: "Muted", hex: "#9ca3af", tw: "neutral-400" },
  { name: "Border", hex: "#1f2937", tw: "neutral-800" },
];

export default function BrandPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <DevBadge label="BRAND" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Brand Tokens
        </h1>
        <p className="mt-2 text-gray-400">
          ScreenCold design system reference. Signal Blue palette with Inter /
          JetBrains Mono typography.
        </p>
      </div>

      <section className="mb-12">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
          Palette
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {palette.map((c) => (
            <div
              key={c.hex}
              className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden"
            >
              <div className="h-16 w-full" style={{ backgroundColor: c.hex }} />
              <div className="p-3">
                <p className="text-xs font-medium text-white">{c.name}</p>
                <p className="text-xs font-mono text-gray-400">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
          Typography
        </h2>
        <div className="space-y-4 rounded-xl border border-[#1f2937] bg-[#111827] p-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Body — Inter</p>
            <p className="text-2xl text-white" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              The quick brown fox jumps over the lazy dog
            </p>
          </div>
          <div className="border-t border-[#1f2937] pt-4">
            <p className="text-xs text-gray-500 mb-1">Code — JetBrains Mono</p>
            <p
              className="text-lg text-gray-300"
              style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}
            >
              {"const score = audit.run(url);"}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
          CSS Variables
        </h2>
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
          <pre className="text-xs font-mono text-gray-300 leading-relaxed overflow-x-auto">
            {`:root {
  --color-primary: #2563eb;
  --color-primary-light: #60a5fa;
  --color-primary-dark: #1d4ed8;
  --color-secondary: #7c3aed;
  --color-background: #0B1120;
  --color-surface: #111827;
  --color-text: #f9fafb;
  --color-muted: #9ca3af;
  --color-border: #1f2937;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}`}
          </pre>
        </div>
      </section>
    </div>
  );
}
