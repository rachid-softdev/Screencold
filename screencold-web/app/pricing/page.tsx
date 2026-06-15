"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Zap, ArrowRight, Star, Users } from "lucide-react";
import { Button, Badge, Header } from '@screencold/ui';
import { OrganizationSchema, FAQSchema } from "@/components/seo/schema";
import { PLANS, type PlanInfo } from "@/lib/plans";

const planOrder: (keyof typeof PLANS)[] = ['FREE', 'STARTER', 'PRO', 'AGENCY'];

const planFeatures: Record<string, string[]> = {
  FREE: [
    "5 crédits/mois",
    "1 utilisateur",
    "Audits basiques",
    "Email de prospection",
  ],
  STARTER: [
    "50 crédits/mois",
    "1 utilisateur",
    "Audits avancés",
    "Email + P.S. personnalisé",
    "Export CSV",
    "Support par email",
  ],
  PRO: [
    "500 crédits/mois",
    "5 utilisateurs",
    "Audits premium",
    "Email + P.S. personnalisé",
    "Export CSV avancé",
    "Campagnes illimitées",
    "API access",
  ],
  AGENCY: [
    "Crédits illimités",
    "Utilisateurs illimités",
    "Audits premium",
    "Email + P.S. personnalisé",
    "Export CSV avancé",
    "Campagnes illimitées",
    "API access",
    "Support dédié 24/7",
  ],
};

const faqs = [
  {
    q: "Comment sont comptés les crédits ?",
    a: "Chaque audit complète consomme 1 crédit. Les audits échoués ne sont pas débités.",
  },
  {
    q: "Puis-je changer de plan à tout moment ?",
    a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement.",
  },
  {
    q: "Que se passe-t-il si je dépasse mes crédits ?",
    a: "Vous pouvez acheter des crédits supplémentaires ou attendre le renouvellement mensuel.",
  },
  {
    q: "Y a-t-il un engagement de durée ?",
    a: "Non, tous nos plans sont sans engagement. Vous pouvez annuler à tout moment.",
  },
];

const testimonials = [
  {
    quote: "ScreenCold m'a fait gagner des heures chaque semaine. Mes audits sont maintenant automatiques !",
    author: "Marie L.",
    role: "Fondatrice, Agence SEO",
  },
  {
    quote: "Le qualité des emails générés est impressionnante. Mon taux de réponse a augmenté de 40%.",
    author: "Thomas B.",
    role: "Commercial, Agence Web",
  },
];

function PricingPage() {
  const [isAnnual, setIsAnnual] = React.useState(false);

  const getPrice = (plan: PlanInfo) => {
    const monthlyPrice = isAnnual ? plan.yearlyPrice : plan.monthlyPrice;
    return monthlyPrice;
  };

  const getAnnualSavings = (plan: PlanInfo) => {
    const annualTotal = plan.monthlyPrice * 12;
    const yearlyTotal = plan.yearlyPrice;
    return annualTotal - yearlyTotal;
  };

  return (
    <div className="min-h-screen bg-white">
      <Header navLinks={[]} />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="default" className="mb-4 bg-info-100 text-info-700 hover:bg-info-100">
            <Zap className="mr-1 h-3 w-3" />
            tarifs simples et transparents
          </Badge>
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl">
            Trouvez le plan idéal pour votre agency
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
            Des audits de site automatisés aux emails de prospection personnalisés,
            ScreenCold vous fait gagner du temps et augmenter vos conversions.
          </p>
          
          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-neutral-900' : 'text-neutral-500'}`}>
              Mensuel
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnnual ? 'bg-info-600' : 'bg-neutral-200'
              }`}
              role="switch"
              aria-checked={isAnnual}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnnual ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-neutral-900' : 'text-neutral-500'}`}>
              Annuel
            </span>
            {isAnnual && (
              <Badge variant="default" className="bg-success-100 text-success-700">
                -20%
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {planOrder.map((planKey) => {
            const plan = PLANS[planKey as keyof typeof PLANS];
            const isPopular = planKey === 'STARTER';
            const price = getPrice(plan);
            const features = planFeatures[planKey];

            return (
              <div
                key={planKey}
                className={`relative rounded-2xl border p-6 ${
                  isPopular
                    ? "border-info-500 bg-info-50 shadow-lg shadow-info-100"
                    : "border-neutral-200 bg-white"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-info-600 text-white hover:bg-info-600">
                      <Star className="mr-1 h-3 w-3" />
                      Populaire
                    </Badge>
                  </div>
                )}

                <h3 className="text-xl font-bold text-neutral-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-neutral-500">{plan.description}</p>

                <div className="mt-4">
                  <span className="text-4xl font-bold text-neutral-900">
                    {price}€
                  </span>
                  <span className="text-neutral-500">/mois</span>
                  {isAnnual && plan.monthlyPrice > 0 && (
                    <span className="ml-2 text-sm text-success-600">
                      (-{getAnnualSavings(plan)}€/an)
                    </span>
                  )}
                </div>

                <ul className="mt-6 space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-success-500 shrink-0" />
                      <span className="text-sm text-neutral-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register" className="mt-6 block">
                  <Button
                    className="w-full"
                    variant={isPopular ? "default" : "secondary"}
                  >
                    {planKey === 'AGENCY' ? 'Contacter les ventes' : isAnnual ? 'Essai gratuit 14 jours' : 'Commencer'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-neutral-500">
          Tous les plans incluent un essai gratuit de 14 jours. Sans carte bancaire.
        </p>
      </section>

      {/* Social Proof */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium text-neutral-500">
            Utilisé par 500+ agences et freelances
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900">
            Ce que disent nos clients
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <p className="text-neutral-600">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="mt-4">
                  <p className="font-medium text-neutral-900">{testimonial.author}</p>
                  <p className="text-sm text-neutral-500">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features comparison */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900">
            Comparaison des fonctionnalités
          </h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="py-4 text-left text-sm font-medium text-neutral-900">
                    Fonctionnalite
                  </th>
                  <th className="py-4 text-center text-sm font-medium text-neutral-900">
                    Gratuit
                  </th>
                  <th className="py-4 text-center text-sm font-medium text-neutral-900">
                    Starter
                  </th>
                  <th className="py-4 text-center text-sm font-medium text-neutral-900">
                    Pro
                  </th>
                  <th className="py-4 text-center text-sm font-medium text-neutral-900">
                    Agency
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-4 text-sm text-neutral-600">Crédits/mois</td>
                  <td className="py-4 text-center text-sm text-neutral-600">5</td>
                  <td className="py-4 text-center text-sm text-neutral-600">50</td>
                  <td className="py-4 text-center text-sm text-neutral-600">500</td>
                  <td className="py-4 text-center text-sm text-neutral-600">Illimités</td>
                </tr>
                <tr>
                  <td className="py-4 text-sm text-neutral-600">Utilisateurs</td>
                  <td className="py-4 text-center text-sm text-neutral-600">1</td>
                  <td className="py-4 text-center text-sm text-neutral-600">1</td>
                  <td className="py-4 text-center text-sm text-neutral-600">5</td>
                  <td className="py-4 text-center text-sm text-neutral-600">
                    <Users className="mx-auto h-4 w-4 text-neutral-600" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-sm text-neutral-600">Campagnes</td>
                  <td className="py-4 text-center">
                    <span className="text-neutral-400">—</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className="text-neutral-400">—</span>
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-sm text-neutral-600">Export CSV</td>
                  <td className="py-4 text-center">
                    <span className="text-neutral-400">—</span>
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                </tr>
                <tr>
                  <td className="py-4 text-sm text-neutral-600">API Access</td>
                  <td className="py-4 text-center">
                    <span className="text-neutral-400">—</span>
                  </td>
                  <td className="py-4 text-center">
                    <span className="text-neutral-400">—</span>
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                  <td className="py-4 text-center">
                    <Check className="mx-auto h-4 w-4 text-success-500" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-neutral-900">
            Questions fréquentes
          </h2>
          <div className="mt-10 space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl bg-white p-6 shadow-sm">
                <h3 className="font-medium text-neutral-900">{faq.q}</h3>
                <p className="mt-2 text-sm text-neutral-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-neutral-900">
            Prêt à transformer votre prospection ?
          </h2>
          <p className="mt-4 text-neutral-600">
            Commencez gratuitement et découvrez comment ScreenCold peut vous faire
            gagner du temps.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg">
                Créer un compte gratuit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" size="lg">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info-600">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <span className="text-lg font-bold text-neutral-900">ScreenCold</span>
            </div>
            <p className="text-sm text-neutral-500">
              2026 ScreenCold. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* SEO Schema */}
      <OrganizationSchema 
        url={process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'} 
        description="ScreenCold automatise les audits de sites web et génère des emails de prospection personnalisés par IA."
      />
      <FAQSchema faqs={faqs.map(f => ({ question: f.q, answer: f.a }))} />
    </div>
  );
}

export default PricingPage;