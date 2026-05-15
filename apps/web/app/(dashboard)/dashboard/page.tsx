"use client";

import * as React from "react";
import Link from "next/link";
import { Search, TrendingUp, Zap, ArrowRight, BarChart3, Mail } from "lucide-react";
import { CreditCounter } from "@/components/dashboard/credit-counter";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickAuditForm } from "@/components/dashboard/quick-audit-form";
import { RecentAudits } from "@/components/dashboard/recent-audits";
import { OnboardingTour } from "@/components/onboarding/onboarding-tour";
import { Button } from "@/components/ui/button";

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

  const isEmpty = recentAudits.length === 0 && stats.totalAudits === 0;

  return (
    <div className="space-y-8">
      {/* Onboarding Tour */}
      <OnboardingTour />

      {/* Credit Counter */}
      <CreditCounter credits={user.credits} plan={user.plan} />

      {/* Quick Audit Form */}
      <div data-tour="quick-audit-form">
        <QuickAuditForm />
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Audits or Empty State */}
      {isEmpty ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <BarChart3 className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            Aucun audit pour le moment
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Commencez par analyser le site web d'un prospect. C'est rapide et
            gratuit avec vos 5 crédits.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/audits/new">
              <Button>
                <Search className="mr-2 h-4 w-4" />
                Faire mon premier audit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/campaigns/new">
              <Button variant="secondary">
                <Mail className="mr-2 h-4 w-4" />
                Importer un CSV
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <RecentAudits audits={auditsForComponent} />
      )}
    </div>
  );
}

export default DashboardPage;