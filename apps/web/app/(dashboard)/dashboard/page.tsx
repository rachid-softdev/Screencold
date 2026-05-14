"use client";

import * as React from "react";
import Link from "next/link";
import { Search, TrendingUp, Zap } from "lucide-react";
import { CreditCounter } from "@/components/dashboard/credit-counter";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickAuditForm } from "@/components/dashboard/quick-audit-form";
import { RecentAudits } from "@/components/dashboard/recent-audits";

interface DashboardData {
  user: {
    id: string;
    name: string | null;
    email: string;
    plan: string;
    credits: number;
    creditsResetsAt: string | null;
    memberSince: string;
  };
  stats: {
    thisMonthAudits: number;
    lastMonthAudits: number;
    totalAudits: number;
    auditsChange: number;
    creditsUsed: number;
  };
  recentAudits: Array<{
    id: string;
    status: string;
    overallScore: number | null;
    screenshotUrl: string | null;
    createdAt: string;
    prospect: {
      id: string;
      url: string;
      companyName: string | null;
      contactName: string | null;
      status: string;
    };
  }>;
}

function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard");
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || "Une erreur est survenue"}</p>
      </div>
    );
  }

  const { user, stats, recentAudits } = data;

  const statsCards = [
    {
      title: "Audits ce mois",
      value: stats.thisMonthAudits.toString(),
      change: { value: stats.auditsChange, isPositive: stats.auditsChange >= 0 },
      icon: <Search className="h-5 w-5" />,
      variant: "default" as const,
    },
    {
      title: "Total audits",
      value: stats.totalAudits.toString(),
      change: null,
      icon: <TrendingUp className="h-5 w-5" />,
      variant: "success" as const,
    },
    {
      title: "Crédits utilisés",
      value: stats.creditsUsed.toString(),
      change: null,
      icon: <Zap className="h-5 w-5" />,
      variant: "warning" as const,
    },
  ];

  // Map audits for component
  const auditsForComponent = recentAudits.map((audit) => ({
    id: audit.id,
    companyName: audit.prospect.companyName || "Entreprise",
    screenshotUrl: audit.screenshotUrl,
    overallScore: audit.overallScore,
    status: audit.status,
    createdAt: audit.createdAt,
  }));

  return (
    <div className="space-y-8">
      {/* Credit Counter */}
      <CreditCounter credits={user.credits} plan={user.plan} />

      {/* Quick Audit Form */}
      <QuickAuditForm />

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Audits */}
      <RecentAudits audits={auditsForComponent} />
    </div>
  );
}

export default DashboardPage;