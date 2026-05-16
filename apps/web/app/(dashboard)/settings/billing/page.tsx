"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap, CreditCard, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PLANS, type Plan, type PlanInfo } from "@/lib/plans";

const planOrder: Plan[] = ['FREE', 'STARTER', 'PRO', 'AGENCY'];

interface UserData {
  plan: string;
  credits: number;
  creditsResetsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  createdAt: string;
}

const CREDIT_PACKAGES = [
  { credits: 10, price: 9, name: "Pack 10 crédits" },
  { credits: 25, price: 19, name: "Pack 25 crédits" },
  { credits: 50, price: 35, name: "Pack 50 crédits" },
  { credits: 100, price: 60, name: "Pack 100 crédits" },
];

function BillingPage() {
  const { addToast } = useToast();
  const [isUpgrading, setIsUpgrading] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<UserData | null>(null);
  const [creditsUsed, setCreditsUsed] = React.useState(0);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userResponse, transactionsResponse] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/billing/transactions"),
      ]);

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserData({
          plan: userData.plan || 'FREE',
          credits: userData.credits || 0,
          creditsResetsAt: userData.creditsResetsAt,
          stripeCustomerId: userData.stripeCustomerId,
          stripeSubscriptionId: userData.stripeSubscriptionId,
        });
        setCreditsUsed(userData.creditsUsed || 0);
      }

      if (transactionsResponse.ok) {
        const transData = await transactionsResponse.json();
        setTransactions(transData.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentPlan = (planKey: string): PlanInfo | undefined => {
    return PLANS[planKey as Plan];
  };

  const handleUpgrade = async (planId: string) => {
    setIsUpgrading(planId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast("Erreur lors de la création du checkout", "error");
      }
    } catch (err) {
      addToast("Erreur lors de la redirection", "error");
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleBuyCredits = async (packageIndex: number) => {
    const pkg = CREDIT_PACKAGES[packageIndex];
    try {
      const response = await fetch("/api/stripe/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: pkg.credits, price: pkg.price }),
      });
      
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        addToast("Erreur lors de l'achat de crédits", "error");
      }
    } catch (err) {
      addToast("Erreur lors de l'achat", "error");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlanKey = (userData?.plan || 'FREE') as Plan;
  const currentPlan = getCurrentPlan(currentPlanKey);
  const creditsTotal = currentPlan?.credits === -1 ? 'Illimité' : currentPlan?.credits || 5;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Facturation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez votre abonnement et vos crédits
        </p>
      </div>

      {/* Current Plan */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Plan {currentPlan?.name || 'Gratuit'}
              </h2>
              <Badge variant="success">Actif</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {userData?.stripeSubscriptionId 
                ? `Abonnement mensuel - Renouvellement le ${userData.creditsResetsAt ? new Date(userData.creditsResetsAt).toLocaleDateString('fr-FR') : 'prochain mois'}`
                : 'Plan gratuit'
              }
            </p>
          </div>
          <Link href="/pricing">
            <Button variant="secondary" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
              Changer de plan
            </Button>
          </Link>
        </div>

        {/* Credits usage */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Crédits utilisés ce mois</span>
            <span className="font-medium text-gray-900">
              {creditsUsed} / {creditsTotal}
            </span>
          </div>
          {currentPlan?.credits !== -1 && (
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${
                  (creditsUsed / (currentPlan?.credits || 1)) > 0.8 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${Math.min((creditsUsed / (currentPlan?.credits || 1)) * 100, 100)}%` }}
              />
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {currentPlan?.credits === -1 
              ? 'Crédits illimités'
              : `${(currentPlan?.credits || 5) - creditsUsed} crédits restants ce mois`
            }
          </p>
        </div>
      </div>

      {/* Buy Additional Credits */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Acheter des crédits supplémentaires
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIT_PACKAGES.map((pkg, index) => (
            <div
              key={index}
              className="rounded-xl border border-gray-200 bg-white p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-gray-900">{pkg.credits}</span>
              </div>
              <p className="text-sm text-gray-500">crédits</p>
              <div className="mt-3">
                <span className="text-xl font-bold text-gray-900">{pkg.price}€</span>
              </div>
              <Button
                className="mt-3 w-full"
                variant="secondary"
                size="sm"
                onClick={() => handleBuyCredits(index)}
              >
                Acheter
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Plans Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Nos plans
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planOrder.map((planKey) => {
            const plan = PLANS[planKey];
            const isCurrentPlan = planKey === currentPlanKey;
            
            return (
              <div
                key={planKey}
                className={`rounded-xl border p-6 ${
                  plan.popular
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                    : "border-gray-200 bg-white"
                } ${isCurrentPlan ? "ring-2 ring-blue-500 ring-opacity-50" : ""}`}
              >
                {plan.popular && (
                  <Badge variant="default" className="mb-3 bg-blue-100 text-blue-700">
                    Populaire
                  </Badge>
                )}

                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.monthlyPrice === 0 ? '0' : plan.monthlyPrice}€
                  </span>
                  <span className="text-gray-500">/mois</span>
                </div>

                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-600">
                      {plan.credits === -1 ? 'Crédits illimités' : `${plan.credits} crédits/mois`}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm text-gray-600">
                      {plan.features.teamAccess === -1 
                        ? 'Utilisateurs illimités' 
                        : `${plan.features.teamAccess} utilisateur${plan.features.teamAccess > 1 ? 's' : ''}`
                      }
                    </span>
                  </li>
                  {plan.features.csvExport && (
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-600">Export CSV</span>
                    </li>
                  )}
                  {plan.features.apiAccess && (
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-600">Accès API</span>
                    </li>
                  )}
                </ul>

                <div className="mt-6">
                  {isCurrentPlan ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Plan actuel
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.popular ? "default" : "secondary"}
                      onClick={() => handleUpgrade(planKey)}
                      loading={isUpgrading === planKey}
                    >
                      {planKey === 'AGENCY' ? 'Contacter' : 'Choisir'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Historique des transactions
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {transactions.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Montant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((trans) => (
                  <tr key={trans.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(trans.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {trans.type === 'PURCHASE' && 'Achat de crédits'}
                      {trans.type === 'MONTHLY_REFILL' && 'Renouvellement mensuel'}
                      {trans.type === 'DEBIT' && 'Utilisation'}
                      {trans.type === 'REFUND' && 'Remboursement'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {trans.type === 'DEBIT' ? `-${trans.amount}` : `+${trans.amount}`} €
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Payé</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-8 w-8 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Aucune transaction</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BillingPage;