"use client";

import * as React from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Users, ArrowRight } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  prospectCount: number;
  doneCount: number;
  createdAt: string;
}

interface CampaignListProps {
  campaigns: Campaign[];
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const progress = campaign.prospectCount > 0
    ? (campaign.doneCount / campaign.prospectCount) * 100
    : 0;

  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {campaign.name}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>
              {campaign.doneCount} / {campaign.prospectCount} audits complétés
            </span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              progress === 100
                ? "bg-green-500"
                : progress > 0
                ? "bg-blue-500"
                : "bg-gray-300"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {Math.round(progress)}% complété
        </p>
      </div>
    </Link>
  );
}

function CampaignList({ campaigns }: CampaignListProps) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-medium text-gray-900">
          Aucune campagne
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Créez votre première campagne pour commencer à auditer des prospects.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}

export { CampaignList };