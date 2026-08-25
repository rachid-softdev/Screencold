import { notFound } from "next/navigation";
import { DevBadge } from "@/components/dev/DevBadge";
import Link from "next/link";

export default function FourOhFourPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <DevBadge label="PREVIEW" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          404 Page Preview
        </h1>
        <p className="mt-2 text-gray-400">
          This is the custom not-found page rendered by{" "}
          <code className="text-xs font-mono bg-[#1f2937] px-1.5 py-0.5 rounded">
            app/not-found.tsx
          </code>
        </p>
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[#1f2937] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-gray-400 font-mono">
            /404-preview
          </span>
        </div>

        <div className="bg-[#0B1120] flex items-center justify-center p-12">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-white mb-3">404</h2>
            <p className="text-gray-400 mb-6">Page not found</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-[#2563eb] text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
