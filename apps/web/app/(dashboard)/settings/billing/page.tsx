"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap, CreditCard, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

const plans = [
  {
    id: "free",
    name: "Gratuit",
    price: 0,
    description: "Pour découvrir ScreenCold",
    features: [
      "5 crédits/mois",
      "1 utilisateur",
      "Audits basiques",
      "Email de prospection",
      "Support par email",
    ],
    limitations: [
      "Pas de campagnes",
      "Pas d'export CSV",
      "Pas d'API",
    ],
    cta: "Commencer gratuitement",
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 29,
    description: "Pour les freelances et petites agences",
    features: [
      "50 crédits/mois",
      "1 utilisateur",
      "Audits avancés",
      "Email + P.S. personnalisé",
      "Export CSV",
      "Support prioritaire",
    ],
    limitations: [
      "Pas de campagnes",
      "Pas d'API",
    ],
    cta: "Démarrer avec Starter",
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    description: "Pour les agences en croissance",
    features: [
      "200 crédits/mois",
      "5 utilisateurs",
      "Audits premium",
      "Email + P.S. personnalisé",
      "Export CSV avancé",
      "Campagnes illimitées",
      "API access",
      "Support dédié",
    ],
    limitations: [],
    cta: "Passer à Pro",
    popular: false,
  },
  {
    id: "agency",
    name: "Agency",
    price: 199,
    description: "Pour les grandes agences",
    features: [
      "500 crédits/mois",
      "Utilisateurs illimités",
      "Audits premium",
      "Email + P.S. personnalisé",
      "Export CSV avancé",
      "Campagnes illimitées",
      "API access",
      "Support dédié 24/7",
      "Personnalisation avancée",
      "Intégrations tierces",
    ],
    limitations: [],
    cta: "Contacter les ventes",
    popular: false,
  },
];

function BillingPage() {
  const { addToast } = useToast();
  const [isUpgrading, setIsUpgrading] = React.useState<string | null>(null);

  // Mock current plan
  const currentPlan = "starter";
  const creditsUsed = 23;
  const creditsTotal = 50;

  const handleUpgrade = async (planId: string) => {
    setIsUpgrading(planId);
    try {
      // Simulate Stripe checkout
      await new Promise((resolve) => setTimeout(resolve, 1500));
      addToast(`Redirection vers le paiement ${planId}...`, "info");
    } catch (err) {
      addToast("Erreur lors de la redirection", "error");
    } finally {
      setIsUpgrading(null);
    }
  };

  const handleBuyCredits = async () => {
    addToast("Redirection vers l'achat de crédits...", "info");
  };

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
                Plan {plans.find((p) => p.id === currentPlan)?.name}
              </h2>
              <Badge variant="success">Actif</Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Votre abonnement sera renouvelé le 15 du mois prochain
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
            <span className="text-gray-600">Crédits utilisés</span>
            <span className="font-medium text-gray-900">
              {creditsUsed} / {creditsTotal}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${
                creditsUsed / creditsTotal > 0.8 ? "bg-red-500" : "bg-blue-500"
              }`}
              style={{ width: `${(creditsUsed / creditsTotal) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {creditsTotal - creditsUsed} crédits restants ce mois
          </p>
        </div>

        <div className="mt-4">
          <Button variant="secondary" onClick={handleBuyCredits} leftIcon={<CreditCard className="h-4 w-4" />}>
            Acheter des crédits supplémentaires
          </Button>
        </div>
      </div>

      {/* Plans Comparison */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Nos plans
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const isCurrentPlan = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                className={`rounded-xl border p-6 ${
                  plan.popular
                    ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
                    : "border-gray-200"
                } ${isCurrentPlan ? "bg-blue-50/50" : "bg-white"}`}
              >
                {plan.popular && (
                  <Badge variant="default" className="mb-3 bg-blue-100 text-blue-700">
                    Le plus populaire
                  </Badge>
                )}

                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>

                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {plan.price}€
                  </span>
                  <span className="text-gray-500">/mois</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation, index) => (
                    <li key={index} className="flex items-start gap-2 opacity-50">
                      <Check className="h-5 w-5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500">{limitation}</span>
                    </li>
                  ))}
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
                      onClick={() => handleUpgrade(plan.id)}
                      loading={isUpgrading === plan.id}
                    >
                      {plan.cta}
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
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">1 jan. 2024</td>
                <td className="px-4 py-3 text-sm text-gray-900">Plan Starter - Abonnement mensuel</td>
                <td className="px-4 py-3 text-sm text-gray-600">29,00 €</td>
                <td className="px-4 py-3"><Badge variant="success">Payé</Badge></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">15 déc. 2023</td>
                <td className="px-4 py-3 text-sm text-gray-900">Crédits supplémentaires (20)</td>
                <td className="px-4 py-3 text-sm text-gray-600">10,00 €</td>
                <td className="px-4 py-3"><Badge variant="success">Payé</Badge></td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-600">1 déc. 2023</td>
                <td className="px-4 py-3 text-sm text-gray-900">Plan Starter - Abonnement mensuel</td>
                <td className="px-4 py-3 text-sm text-gray-600">29,00 €</td>
                <td className="px-4 py-3"><Badge variant="success">Payé</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default BillingPage;