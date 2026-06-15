import type { Metadata } from "next";
import Link from "next/link";
import { Button } from '@screencold/ui';
import { ArrowRight, Zap, Clock, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "ScreenCold pour les freelances — Prospection B2B automatisée",
  description:
    "Automatisez votre prospection B2B en tant que freelance. Audits de sites automatisés et emails personnalisés en 30 secondes.",
  keywords: [
    "freelance",
    "prospection B2B",
    "cold email",
    "automation",
    "audit de site",
    "conversion",
  ],
  openGraph: {
    title: "ScreenCold pour les freelances",
    description:
      "Automatisez votre prospection B2B en tant que freelance.",
    url: "/freelances",
    siteName: "ScreenCold",
    locale: "fr_FR",
    type: "website",
  },
};

const benefits = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Gagnez 10h par semaine",
    description:
      "Automatisez l'analyse de vos prospects et la rédaction de vos emails. Concentrez-vous sur la vente.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Résultats en 30 secondes",
    description:
      "Entrez une URL, obtenez un rapport complet et un email prêt à envoyer. Aucune compétence technique requise.",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Taux de réponse x3",
    description:
      "Les emails personnalisés avec preuves visuelles génèrent 3x plus de réponses que les emails génériques.",
  },
];

export default function FreelancesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl lg:text-6xl">
            Freelances : prospectez{" "}
            <span className="text-info-600">
              sans vous ruiner en temps
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
            En tant que freelance, votre temps est précieux. ScreenCold
            automatise l'analyse de vos prospects et la rédaction de vos emails
            de prospection.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg">
                Essayer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="secondary" size="lg">
                Voir les tarifs (dès 29€/mois)
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            5 crédits gratuits • Sans engagement • Annulation à tout moment
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Pourquoi les freelances choisissent ScreenCold
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info-100 text-info-600">
                  {benefit.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                  {benefit.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Le calcul est simple
          </h2>
          <div className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Temps gagné par audit</span>
                  <span className="font-bold text-neutral-900">20 minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Audits par mois (Starter)</span>
                  <span className="font-bold text-neutral-900">50</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Temps économisé</span>
                  <span className="font-bold text-success-600">
                    16 heures / mois
                  </span>
                </div>
                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Coût du plan Starter</span>
                    <span className="font-bold text-neutral-900">29€ / mois</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">
                      Coût horaire si 50€/h
                    </span>
                    <span className="font-bold text-neutral-900">800€ / mois</span>
                  </div>
                </div>
                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">
                      ROI estimé
                    </span>
                    <span className="text-2xl font-bold text-success-600">
                      x27
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900">
            Prêt à booster votre activité ?
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Rejoignez les freelances qui utilisent ScreenCold pour prospecter
            efficacement.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
