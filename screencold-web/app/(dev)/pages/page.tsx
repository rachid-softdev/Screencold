import { notFound } from "next/navigation";
import Link from "next/link";
import { DevBadge } from "@/components/dev/DevBadge";

const pages = [
  {
    title: "Email Preview",
    description: "Cold email template previews (post-signup sequence)",
    href: "/dev/pages/email-preview",
  },
  {
    title: "Audit Preview",
    description: "Audit result preview with annotated screenshots mock",
    href: "/dev/pages/audit",
  },
  {
    title: "404 Preview",
    description: "Custom not-found page",
    href: "/dev/404-preview",
  },
  {
    title: "Brand",
    description: "Signal Blue palette, typography, and CSS variables",
    href: "/dev/brand",
  },
];

export default function DevHubPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-10">
        <DevBadge />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Dev Pages
        </h1>
        <p className="mt-2 text-gray-400">
          Internal previews and design references. Only available in
          development.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group rounded-xl border border-[#1f2937] bg-[#111827] p-5 transition-colors hover:border-[#2563eb]/40 hover:bg-[#111827]/80"
          >
            <h2 className="text-sm font-semibold text-white group-hover:text-[#60a5fa] transition-colors">
              {page.title}
            </h2>
            <p className="mt-1 text-xs text-gray-400">{page.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="text-sm font-semibold text-white mb-3">
          Technical Details
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt className="text-gray-500">Framework</dt>
          <dd className="text-gray-300">Next.js App Router</dd>
          <dt className="text-gray-500">Styling</dt>
          <dd className="text-gray-300">Tailwind CSS v3</dd>
          <dt className="text-gray-500">Primary</dt>
          <dd className="text-gray-300 font-mono">#2563eb</dd>
          <dt className="text-gray-500">Background</dt>
          <dd className="text-gray-300 font-mono">#0B1120</dd>
          <dt className="text-gray-500">Font</dt>
          <dd className="text-gray-300">Inter / JetBrains Mono</dd>
          <dt className="text-gray-500">Guard</dt>
          <dd className="text-gray-300">NODE_ENV=development</dd>
        </dl>
      </div>
    </div>
  );
}
