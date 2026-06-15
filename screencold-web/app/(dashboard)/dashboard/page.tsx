import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Search, TrendingUp, Zap, ArrowRight, BarChart3, Mail } from 'lucide-react';
import { getDashboardData } from '@/lib/dashboard';
import { CreditCounter } from '@/components/dashboard/credit-counter';
import { StatsCard } from '@/components/dashboard/stats-card';
import { QuickAuditForm } from '@/components/dashboard/quick-audit-form';
import { RecentAudits } from '@/components/dashboard/recent-audits';
import dynamic from 'next/dynamic';
import { Button } from '@screencold/ui';

// Dynamic import for client components to reduce initial bundle
const OnboardingTour = dynamic(() => import('@/components/onboarding/onboarding-tour').then(mod => ({ default: mod.OnboardingTour })), {
  ssr: false,
  loading: () => null,
});

interface PageProps {
  params: Promise<void>;
}

export const metadata = {
  title: 'Dashboard | ScreenCold',
  description: 'Votre tableau de bord ScreenCold',
};

export default async function DashboardPage({}: PageProps) {
  // Server-side parallel data fetching
  const data = await getDashboardData();

  // Redirect if not authenticated
  if (!data) {
    redirect('/login');
  }

  const { user, stats, recentAudits } = data;

  const statsCards = [
    {
      title: 'Audits ce mois',
      value: stats.thisMonthAudits.toString(),
      change: { value: stats.auditsChange, isPositive: stats.auditsChange >= 0 },
      icon: <Search className="h-5 w-5" />,
      variant: 'default' as const,
    },
    {
      title: 'Total audits',
      value: stats.totalAudits.toString(),
      change: undefined,
      icon: <TrendingUp className="h-5 w-5" />,
      variant: 'success' as const,
    },
    {
      title: 'Crédits utilisés',
      value: stats.creditsUsed.toString(),
      change: undefined,
      icon: <Zap className="h-5 w-5" />,
      variant: 'warning' as const,
    },
  ];

  // Map audits for component
  const auditsForComponent = recentAudits.map((audit) => ({
    id: audit.id,
    companyName: audit.prospect.companyName || 'Entreprise',
    screenshotUrl: audit.screenshotUrl,
    overallScore: audit.overallScore,
    status: audit.status,
    createdAt: audit.createdAt,
  }));

  const isEmpty = recentAudits.length === 0 && stats.totalAudits === 0;

  return (
    <div className="space-y-8">
      {/* Onboarding Tour - loaded dynamically to avoid hydration */}
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
        <div className="rounded-xl border-2 border-dashed border-neutral-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-info-100">
            <BarChart3 className="h-8 w-8 text-info-600" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-neutral-900">
            Aucun audit pour le moment
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
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