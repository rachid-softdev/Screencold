"use client";

import * as React from "react";
import Link from "next/link";
import { Search, TrendingUp, Zap, BarChart3 } from "lucide-react";
import { CreditCounter } from "@/components/dashboard/credit-counter";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickAuditForm } from "@/components/dashboard/quick-audit-form";
import { RecentAudits } from "@/components/dashboard/recent-audits";

function DashboardPage() {
  // Mock data - replace with actual data fetching
  const userCredits = 12;
  const userPlan = "PRO";

  const stats = [
    {
      title: "Audits ce mois",
      value: "24",
      change: { value: 12, isPositive: true },
      icon: <Search className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Taux de réponse",
      value: "8.3%",
      change: { value: 2.1, isPositive: true },
      icon: <TrendingUp className="h-5 w-5" />,
      variant: "success" as const,
    },
    {
      title: "Crédits utilisés",
      value: "18",
      change: { value: 5, isPositive: false },
      icon: <Zap className="h-5 w-5" />,
      variant: "warning" as const,
    },
  ];

  const recentAudits = [
    {
      id: "1",
      companyName: "Acme Corp",
      screenshotUrl: null,
      overallScore: 72,
      status: "READY",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: "2",
      companyName: "TechStart SAS",
      screenshotUrl: null,
      overallScore: 45,
      status: "READY",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "3",
      companyName: "Design Studio",
      screenshotUrl: null,
      overallScore: null,
      status: "PROCESSING",
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Credit Counter */}
      <CreditCounter credits={userCredits} plan={userPlan} />

      {/* Quick Audit Form */}
      <QuickAuditForm />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Audits */}
      <RecentAudits audits={recentAudits} />
    </div>
  );
}

export default DashboardPage;