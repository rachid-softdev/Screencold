import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'À propos - ScreenCold - L\'IA au service de la prospection B2B',
  description: 'Découvrez comment ScreenCold utilise l\'IA pour automatiser les audits de sites web et générer des emails de prospection personnalisés. Fondée en 2024 par des experts en IA et B2B.',
  keywords: ['prospection B2B', 'audit de site', 'IA', 'cold outreach', 'automatisation', 'email personnalisé'],
  openGraph: {
    title: 'À propos - ScreenCold',
    description: 'Découvrez comment ScreenCold transforme la prospection B2B avec des audits automatisés.',
    url: '/about',
    siteName: 'ScreenCold',
    locale: 'fr_FR',
    type: 'website',
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">ScreenCold</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Tarifs
            </Link>
            <Link href="/contact" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Contact
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Se connecter
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900">À propos de ScreenCold</h1>
          
          <div className="mt-8 prose prose-lg max-w-none">
            <p className="text-lg text-gray-600">
              ScreenCold est une solution innovative qui combine l'intelligence artificielle 
              et l'automatisation pour transformer la prospection B2B.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Notre mission</h2>
            <p className="text-gray-600">
              Nous croyons que chaque entreprise mérite un accès facile à des données precisas 
              sur ses prospects. Notre objectif est de simplifier le processus d'audit de sites 
              web pour permettre aux professionnels de la vente de se concentrer sur ce qui 
              compte vraiment : construire des relations.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Notre histoire</h2>
            <p className="text-gray-600">
              Fondée en 2024 par une équipe d'experts en IA et en vente B2B, ScreenCold 
              est née d'une frustration commune : perdre trop de temps à analyser 
              manuellement les sites web des prospects. Nous avons décidé de créer un outil 
              qui automatise ce processus tout en générant des emails de prospection personnalisés.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">Nos valeurs</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Innovation</strong> : Nous utilisons les dernières avancées en IA pour améliorer nos services</li>
              <li><strong>Simplicité</strong> : Nous rendons les choses complexes accessibles à tous</li>
              <li><strong>Confidentialité</strong> : Nous protégeons les données de nos utilisateurs</li>
              <li><strong>Efficacité</strong> : Nous aidons nos clients à gagner du temps</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8">L'équipe</h2>
            <p className="text-gray-600">
              Notre équipe est composée de développeurs, de spécialistes en marketing B2B 
              et d'experts en intelligence artificielle. Nous partageons une passion commune 
              pour l'innovation et le service client.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500">© 2024 ScreenCold. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}