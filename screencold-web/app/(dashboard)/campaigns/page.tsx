"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from '@screencold/ui';
import { CampaignList } from "@/components/campaigns/campaign-list";

function CampaignsPage() {
  // Mock data - replace with actual data fetching
  const campaigns = [
    {
      id: "1",
      name: "Prospects Janvier 2024",
      prospectCount: 25,
      doneCount: 18,
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: "2",
      name: "Agence Web Design",
      prospectCount: 12,
      doneCount: 12,
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
      id: "3",
      name: "Startup Tech",
      prospectCount: 8,
      doneCount: 3,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""}
          </h2>
          <p className="text-sm text-neutral-500">
            Gérez vos campagnes d&apos;audit et de prospection
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button leftIcon={<Plus className="h-4 w-4" />}>
            Nouvelle campagne
          </Button>
        </Link>
      </div>

      {/* Campaign List */}
      <CampaignList campaigns={campaigns} />
    </div>
  );
}

export default CampaignsPage;