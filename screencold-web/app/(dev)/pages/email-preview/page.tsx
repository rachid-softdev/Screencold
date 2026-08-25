import { notFound } from "next/navigation";
import { DevBadge } from "@/components/dev/DevBadge";
import {
  postSignupSequence,
  renderEmail,
} from "@/lib/email-sequences";

const sampleVars: Record<string, string> = {
  name: "Thomas",
  dashboardUrl: "https://app.screencold.com/dashboard",
  pricingUrl: "https://screencold.com/pricing",
  customer: "Thomas",
  creditsUsed: "3",
  totalCredits: "5",
};

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const rendered = postSignupSequence.map((tpl) => renderEmail(tpl, sampleVars));

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="mb-10">
        <DevBadge label="EMAIL PREVIEW" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          Cold Email Templates
        </h1>
        <p className="mt-2 text-gray-400">
          Post-signup drip sequence generated from{" "}
          <code className="text-xs font-mono bg-[#1f2937] px-1.5 py-0.5 rounded">
            lib/email-sequences.ts
          </code>
        </p>
      </div>

      <div className="space-y-8">
        {rendered.map((email, i) => {
          const tpl = postSignupSequence[i]!;
          return (
            <div
              key={tpl.subject}
              className="rounded-xl border border-[#1f2937] bg-[#111827] overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-[#1f2937] px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563eb]/15 text-xs font-bold text-[#60a5fa]">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-white">
                    Day {tpl.delayDays}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  +{tpl.delayDays}d delay
                </span>
              </div>

              <div className="px-5 py-4">
                <p className="text-xs text-gray-500 mb-1">Subject</p>
                <p className="text-sm font-medium text-white mb-4">
                  {email.subject}
                </p>

                <p className="text-xs text-gray-500 mb-1">Body</p>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed bg-[#0B1120] rounded-lg p-4 border border-[#1f2937]">
                  {email.body}
                </pre>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12 rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="text-sm font-semibold text-white mb-3">
          Template Variables
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1f2937]">
                <th className="pb-2 text-left text-gray-500 font-medium">
                  Variable
                </th>
                <th className="pb-2 text-left text-gray-500 font-medium">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(sampleVars).map(([key, val]) => (
                <tr key={key} className="border-b border-[#1f2937]/50">
                  <td className="py-2 font-mono text-[#60a5fa]">
                    {`{{${key}}}`}
                  </td>
                  <td className="py-2 text-gray-300">{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
