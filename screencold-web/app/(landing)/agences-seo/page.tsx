import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@screencold/ui";
import { ArrowRight, Search, BarChart3, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "ScreenCold pour les agences SEO — Audits automatisés et prospection",
  description:
    "Automatisez vos audits de sites clients et générez des emails de prospection personnalisés. Gagnez du temps et signez plus de clients.",
  keywords: [
    "agence SEO",
    "audit de site",
    "prospection B2B",
    "cold email",
    "automation",
    "conversion",
  ],
  openGraph: {
    title: "ScreenCold pour les agences SEO",
    description:
      "Automatisez vos audits de sites clients et générez des emails de prospection personnalisés.",
    url: "/agences-seo",
    siteName: "ScreenCold",
    locale: "fr_FR",
    type: "website",
  },
};

const painPoints = [
  "Vous passez 20+ minutes à analyser chaque prospect manuellement",
  "Vos emails de prospection sont génériques et peu convaincants",
  "Vous n'arrivez pas à scaler votre prospection",
];

const benefits = [
  {
    icon: <Search className="h-6 w-6" />,
    title: "Audit en 30 secondes",
    description:
      "Analysez n'importe quel site web instantanément. Score de conversion, problèmes UX, recommandations.",
  },
  {
    icon: <Mail className="h-6 w-6" />,
    title: "Emails personnalisés",
    description: "Chaque email mentionne des problèmes concrets observés sur le site du prospect.",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Recommandations concrètes",
    description:
      "Chaque rapport liste les problèmes observés, classés par priorité, avec des recommandations actionnables.",
  },
];

export default function AgencesSEOPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl lg:text-6xl">
            Agence SEO : signez plus de clients avec{" "}
            <span className="text-info-600">des audits automatisés</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
            Analysez les sites de vos prospects en 30 secondes et générez des emails de prospection
            personnalisés à partir des points faibles détectés.
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
                Voir les tarifs
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-neutral-500">
            5 crédits gratuits • Aucune carte bancaire requise
          </p>
        </div>
      </section>

      {/* Pain Points */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Vous reconnaissez ces défis ?
          </h2>
          <div className="mx-auto mt-10 max-w-2xl space-y-4">
            {painPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error-100 text-error-600">
                  <span className="text-sm font-bold">!</span>
                </div>
                <p className="text-neutral-700">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            ScreenCold résout tout ça
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info-100 text-info-600">
                  {benefit.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-neutral-900">{benefit.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Getting started */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-neutral-900">
              Commencer en quelques minutes
            </h2>
            <ul className="mt-4 space-y-3 text-neutral-700">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-success-600">✓</span>
                Créez votre compte : 5 crédits offerts, sans carte bancaire.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-success-600">✓</span>
                Collez l&apos;URL d&apos;un site et recevez audit + email personnalisé en 30
                secondes.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 text-success-600">✓</span>
                Passez à un plan payant uniquement si l&apos;outil vous convient.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900">Prêt à scaler votre prospection ?</h2>
          <p className="mt-4 text-lg text-neutral-600">
            Commencez gratuitement pour tester sur vos propres prospects : 5 crédits offerts, sans
            carte bancaire.
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
