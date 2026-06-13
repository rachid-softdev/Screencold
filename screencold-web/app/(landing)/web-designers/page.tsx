import type { Metadata } from "next";
import Link from "next/link";
import { Button } from '@screencold/ui';
import { ArrowRight, Palette, Eye, Mail } from "lucide-react";

export const metadata: Metadata = {
  title:
    "ScreenCold pour les web designers — Audits UX automatisés et prospection",
  description:
    "Identifiez les problèmes UX de vos prospects et générez des emails de prospection personnalisés. Transformez vos audits en opportunités commerciales.",
  keywords: [
    "web designer",
    "audit UX",
    "prospection",
    "design",
    "conversion",
    "email personnalisé",
  ],
  openGraph: {
    title: "ScreenCold pour les web designers",
    description:
      "Identifiez les problèmes UX de vos prospects et générez des emails de prospection personnalisés.",
    url: "/web-designers",
    siteName: "ScreenCold",
    locale: "fr_FR",
    type: "website",
  },
};

const benefits = [
  {
    icon: <Eye className="h-6 w-6" />,
    title: "Détection UX instantanée",
    description:
      "Notre IA identifie les problèmes de hiérarchie visuelle, de contraste, d'espacement et de navigation.",
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "Annotations visuelles",
    description:
      "Chaque problème est matérialisé par un encadré coloré directement sur le screenshot du site.",
  },
  {
    icon: <Mail className="h-6 w-6" />,
    title: "Emails qui convertissent",
    description:
      "Mentionnez des problèmes concrets dans vos emails. Les prospects répondent quand ils voient des preuves.",
  },
];

export default function WebDesignersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-neutral-900 sm:text-5xl lg:text-6xl">
            Web designers : transformez vos audits UX en{" "}
            <span className="text-info-600">
              opportunités commerciales
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-600">
            Identifiez les problèmes UX de vos prospects en 30 secondes.
            Générez des emails personnalisés avec des preuvis visuelles
            concrètes.
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

      {/* Benefits */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Pourquoi les web designers adorent ScreenCold
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {benefits.map((benefit, i) => (
              <div key={i} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
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

      {/* Example */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-neutral-900">
            Exemple d'audit généré
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-600">
            Voici ce que vous obtenez en 30 secondes pour chaque prospect :
          </p>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-error-500" />
                <span className="text-sm text-neutral-700">
                  <strong>CTA non visible</strong> — Le bouton principal est
                  noyé dans la page
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-orange-500" />
                <span className="text-sm text-neutral-700">
                  <strong>Hiérarchie visuelle</strong> — Trop de éléments au
                  même niveau
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-info-500" />
                <span className="text-sm text-neutral-700">
                  <strong>Espacement incohérent</strong> — Marges et paddings
                  non uniformes
                </span>
              </div>
            </div>
            <div className="mt-6 rounded-lg bg-neutral-50 p-4">
              <p className="text-sm text-neutral-600 italic">
                &ldquo;Bonjour, j'ai remarqué que votre page d'accueil manque
                de hiérarchie visuelle. Le CTA principal n'est pas assez visible
                et les espacements sont incohérents. J'ai préparé 3
                recommandations concrètes...&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-neutral-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-neutral-900">
            Prêt à décrocher plus de missions ?
          </h2>
          <p className="mt-4 text-lg text-neutral-600">
            Rejoignez les web designers qui utilisent ScreenCold pour leur
            prospection.
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
