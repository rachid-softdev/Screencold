"use client";

import * as React from "react";
import { clsx } from "clsx";
import { Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  prospectCount: number;
  doneCount: number;
  createdAt: string;
}

interface CampaignListProps {
  campaigns: Campaign[];
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

function CampaignCard({
  campaign,
  isSelected,
  onToggleSelect,
}: {
  campaign: Campaign;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const progress = campaign.prospectCount > 0
    ? (campaign.doneCount / campaign.prospectCount) * 100
    : 0;

  const handleClick = () => {
    router.push(`/campaigns/${campaign.id}`);
  };

  return (
    <div
      className={clsx(
        "group relative cursor-pointer rounded-xl border p-6 transition-all",
        isSelected
          ? "border-info-400 bg-info-50/50 shadow-sm"
          : "border-neutral-200 bg-white hover:border-info-200 hover:shadow-md"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      {/* Checkbox */}
      {onToggleSelect && (
        <div
          className="absolute right-4 top-4 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(campaign.id);
          }}
        >
          <div
            className={clsx(
              "flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors",
              isSelected
                ? "border-info-600 bg-info-600 text-white"
                : "border-neutral-300 bg-white/90 opacity-0 group-hover:opacity-100"
            )}
          >
            {isSelected && (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={clsx(
            "font-semibold transition-colors",
            isSelected ? "text-info-700" : "text-neutral-900 group-hover:text-info-600"
          )}>
            {campaign.name}
          </h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500">
            <Users className="h-4 w-4" />
            <span>
              {campaign.doneCount} / {campaign.prospectCount} audits complétés
            </span>
          </div>
        </div>
        <ArrowRight className="ml-3 h-5 w-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-info-500" />
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500",
              progress === 100
                ? "bg-success-500"
                : progress > 0
                ? "bg-info-500"
                : "bg-neutral-300"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {Math.round(progress)}% complété
        </p>
      </div>
    </div>
  );
}

function CampaignList({ campaigns, selectedIds, onToggleSelect }: CampaignListProps) {
  if (campaigns.length === 0) {
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
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <h3 className="mt-4 text-sm font-medium text-neutral-900">
          Aucune campagne
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Créez votre première campagne pour commencer à auditer des prospects.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <CampaignCard
          key={campaign.id}
          campaign={campaign}
          isSelected={selectedIds?.has(campaign.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}

export { CampaignList };