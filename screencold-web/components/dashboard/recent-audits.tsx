"use client";

import * as React from "react";
import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, ExternalLink } from "lucide-react";
import { Badge } from '@screencold/ui';

interface Audit {
  id: string;
  companyName?: string;
  screenshotUrl?: string | null;
  overallScore?: number | null;
  status: string;
  createdAt: string;
}

interface RecentAuditsProps {
  audits: Audit[];
}

const ScoreBadge = memo(function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <Badge variant="outline">En attente</Badge>;
  }

  const variant =
    score >= 70 ? "success" : score >= 40 ? "warning" : "destructive";

  const label =
    score >= 70 ? `Bon : ${score}/100` : score >= 40 ? `Moyen : ${score}/100` : `Faible : ${score}/100`;

  return <Badge variant={variant}>{label}</Badge>;
});

// Simple date formatter - no need for memoization as it's just string manipulation
function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const RecentAudits = memo(function RecentAudits({ audits }: RecentAuditsProps) {
  if (audits.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-neutral-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-3.086-3.086a2 2 0 00-2.828 0L6 21" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-medium text-neutral-900">
          Aucun audit réalisé
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Lancez votre premier audit pour voir les résultats ici.
        </p>
        <Link
          href="/audits/new"
          className="mt-4 inline-block text-sm font-medium text-info-600 hover:text-info-700"
        >
          Créer un audit →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Audits récents
          </h2>
          <Link
            href="/audits"
            className="text-sm font-medium text-info-600 hover:text-info-700"
          >
            Voir tout
          </Link>
        </div>
      </div>

      <div className="divide-y divide-neutral-100">
        {audits.slice(0, 3).map((audit) => (
          <Link
            key={audit.id}
            href={`/audits/${audit.id}`}
            className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-neutral-50"
          >
            {/* Thumbnail */}
            <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
              {audit.screenshotUrl ? (
                <Image
                  src={audit.screenshotUrl}
                  alt={audit.companyName || "Screenshot"}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 text-neutral-300"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {audit.companyName || "Entreprise"}
              </p>
              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(audit.createdAt)}</span>
              </div>
            </div>

            {/* Score */}
            <ScoreBadge score={audit.overallScore} />

            {/* Arrow */}
            <ExternalLink className="h-4 w-4 text-neutral-400" />
          </Link>
        ))}
      </div>
    </div>
  );
});

export { RecentAudits };