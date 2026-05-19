import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Zap, Target, Mail } from 'lucide-react';
import { OrganizationSchema, SoftwareApplicationSchema, WebSiteSchema } from '@/components/seo/schema';

export const metadata: Metadata = {
  title: 'ScreenCold - Audit de sites et emails de prospection automatisés par IA',
  description: 'Analysez n\'importe quel site web et générez automatiquement des emails de prospection personnalisés. Gagnez du temps et augmentez vos conversions avec notre IA. Essai gratuit.',
  keywords: ['audit de site web', 'prospection B2B', 'cold email', 'IA', 'automation', 'conversion', 'email personnalisé', 'générateur d\'emails'],
  openGraph: {
    title: 'ScreenCold - Audit de sites et emails de prospection automatisés',
    description: 'Analysez n\'importe quel site web et générez automatiquement des emails de prospection personnalisés. Gagnez du temps et augmentez vos conversions.',
    url: '/',
    siteName: 'ScreenCold',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ScreenCold - Automatisez vos audits et votre prospection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ScreenCold - Audit de sites et emails de prospection',
    description: 'Analysez n\'importe quel site web et générez automatiquement des emails de prospection personnalisés.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const features = [
  {
    icon: <Target className="h-6 w-6" />,
    title: "Audits complets",
    description: "Analysez les points clés : SEO, performance, UX, accessibilité et plus encore.",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Rapide et automatisé",
    description: "En quelques secondes, recevez un rapport détaillé avec des recommandations concrètes.",
  },
  {
    icon: <Mail className="h-6 w-6" />,
    title: "Emails prêts à envoyer",
    description: "Générez automatiquement des emails de prospection personnalisés et efficaces.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Facile à utiliser",
    description: "Interface intuitive, aucune compétence requise. Concentrez-vous sur vos ventes.",
  },
];

const testimonials = [
  {
    quote: "ScreenCold m'a fait gagner des heures chaque semaine. Mes audits sont maintenant automatiques !",
    author: "Marie L.",
    role: "Fondatrice, Agence SEO",
    company: "WebBoost",
  },
  {
    quote: "Le qualité des emails générés est impressionnante. Mon taux de réponse a augmenté de 40%.",
    author: "Thomas B.",
    role: "Commercial, Agence Web",
    company: "DigitalPro",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
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
            <span className="text-xl font-bold text-gray-900">ScreenCold</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden text-sm font-medium text-gray-600 hover:text-gray-900 sm:block">
              Se connecter
            </Link>
            <Link href="/register">
              <Button size="sm">Commencer</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl lg:text-6xl">
            Audit de sites et emails de prospection{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              en quelques secondes
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Analysez n&apos;importe quel site web et générez automatiquement des emails de
            prospection personnalisés. Gagnez du temps et augmentez vos conversions.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Essayer gratuitement
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="secondary" size="lg">
                Voir les tarifs
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Aucune carte bancaire requise • Essai gratuit 14 jours
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              ScreenCold automatise vos audits et votre prospection
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div key={index} className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof - Logos */}
      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm font-medium uppercase tracking-wide text-gray-500">
            Utilisé par des agences et freelances en France et en Europe
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale">
            {["WebBoost", "DigitalPro", "StudioUX", "AgenceSEO", "PixelCraft"].map((name) => (
              <span key={name} className="text-xl font-bold text-gray-400">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Comment ça marche</h2>
            <p className="mt-4 text-lg text-gray-600">
              En 3 étapes simples, obtenez un audit complet et un email prêt à envoyer
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Entrez l&apos;URL
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Saisissez l&apos;adresse du site web que vous souhaitez auditer
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Analyse automatique
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Notre IA analyse le site et identifie les points d&apos;amélioration
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Email personnalisé
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Recevez un rapport complet et un email de prospection sur mesure
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Ce que disent nos clients
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="rounded-xl bg-white p-8 shadow-sm">
                <p className="text-lg text-gray-700">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6">
                  <p className="font-semibold text-gray-900">{testimonial.author}</p>
                  <p className="text-sm text-gray-500">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Prêt à transformer votre prospection ?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Rejoignez des centaines de professionnels qui utilisent ScreenCold pour
            accélérer leur croissance.
          </p>
          <div className="mt-8">
            <Link href="/register">
              <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Commencer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
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
              <span className="text-lg font-bold text-gray-900">ScreenCold</span>
            </div>
            <div className="flex gap-8 text-sm text-gray-600">
              <Link href="/pricing" className="hover:text-gray-900">
                Tarifs
              </Link>
              <Link href="/login" className="hover:text-gray-900">
                Se connecter
              </Link>
              <Link href="/register" className="hover:text-gray-900">
                S&apos;inscrire
              </Link>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 ScreenCold
            </p>
          </div>
        </div>
      </footer>

      {/* SEO Schema */}
      <OrganizationSchema 
        url={process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'} 
        description="ScreenCold automatise les audits de sites web et génère des emails de prospection personnalisés par IA."
      />
      <WebSiteSchema url={process.env.NEXT_PUBLIC_APP_URL || 'https://screencold.com'} />
      <SoftwareApplicationSchema />
    </div>
  );
}