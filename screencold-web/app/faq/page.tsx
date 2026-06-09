import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { FAQSchema } from '@/components/seo/schema';

export const metadata: Metadata = {
  title: 'FAQ - Questions fréquentes sur ScreenCold',
  description: 'Trouvez les réponses à vos questions sur ScreenCold : fonctionnement, tarifs, audits, sécurité, intégrations et plus encore.',
  keywords: ['FAQ', 'questions fréquentes', 'ScreenCold', 'comment ça marche', 'tarifs', 'crédits', 'audit de site'],
  openGraph: {
    title: 'FAQ - Questions fréquentes',
    description: 'Trouvez les réponses à vos questions sur ScreenCold.',
    url: '/faq',
    siteName: 'ScreenCold',
    locale: 'fr_FR',
    type: 'website',
  },
};

const faqs = [
  {
    question: "Comment fonctionne ScreenCold ?",
    answer: "ScreenCold analyse automatiquement n'importe quel site web en quelques secondes. Il capture des screenshots, analyse la structure, le SEO, et l'expérience utilisateur, puis génère un email de prospection personnalisé basé sur les éléments identifiés."
  },
  {
    question: "Combien coûte ScreenCold ?",
    answer: "ScreenCold propose plusieurs plans : Gratuit (5 crédits/mois), Starter (29€/mois - 50 crédits), Pro (79€/mois - 200 crédits), et Agency (199€/mois - 500 crédits). Vous pouvez également acheter des crédits supplémentaires à tout moment."
  },
  {
    question: "Qu'est-ce qu'un crédit ?",
    answer: "Chaque audit de site web consomme 1 crédit. Si l'audit échoue pour une raison indépendante de votre volonté (site inaccessible), le crédit vous est remboursé."
  },
  {
    question: "Puis-je essayer gratuitement ?",
    answer: "Oui ! Le plan Gratuit vous donne 5 crédits par mois sans limitation de temps. Vous pouvez également bénéficier d'un essai gratuit de 14 jours sur les plans payants."
  },
  {
    question: "Comment les emails sont-ils générés ?",
    answer: "Notre IA analyse le site web et identifie les points d'amélioration en termes d'UX, de SEO et de conversion. Elle utilise ensuite ces informations pour générer un email de prospection personnalisé qui met en valeur les points identifiés."
  },
  {
    question: "Puis-je utiliser ScreenCold pour mes clients ?",
    answer: "Absolument ! Les plans Pro et Agency sont conçus pour les agences qui souhaitent utiliser ScreenCold pour leurs clients. Vous pouvez créer des audits au nom de vos clients et leur envoyer les rapports."
  },
  {
    question: "Comment puis-je annuler mon abonnement ?",
    answer: "Vous pouvez annuler votre abonnement à tout moment depuis votre espace client. Votre abonnement restera actif jusqu'à la fin de la période payée."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui, nous utilisons des mesures de sécurité strictes pour protéger vos données. Toutes les données sont chiffrées et nous ne partageons jamais vos informations avec des tiers."
  },
  {
    question: "Puis-je integrer ScreenCold à d'autres outils ?",
    answer: "L'API disponible sur les plans Pro et Agency vous permet d'intégrer ScreenCold à vos outils existants (CRM, outils d'emailing, etc.)."
  },
  {
    question: "Comment puis-je obtenir de l'aide ?",
    answer: "Vous pouvez nous contacter via le formulaire de contact, par email à support@screencold.com, ou consulter notre documentation. Notre équipe support est disponible du lundi au vendredi."
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-100 bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-info-600 to-info-700">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <span className="text-xl font-bold text-neutral-900">ScreenCold</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Tarifs
            </Link>
            <Link href="/contact" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
              Contact
            </Link>
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900">Questions fréquentes</h1>
          <p className="mt-4 text-lg text-neutral-600">
            Tout ce que vous devez savoir sur ScreenCold
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <details key={index} className="group rounded-xl border border-neutral-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-medium text-neutral-900">
                {faq.question}
                <ChevronDown className="h-5 w-5 text-neutral-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-6 text-neutral-600">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-info-50 p-6 text-center">
          <p className="text-neutral-700">
            Vous n'avez pas trouvé la réponse à votre question ?
          </p>
          <Link href="/contact" className="mt-4 inline-block text-info-600 hover:text-info-700 font-medium">
           Contactez-nous →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">© 2024 ScreenCold. Tous droits réservés.</p>
        </div>
      </footer>

      {/* FAQ Schema for SEO */}
      <FAQSchema faqs={faqs.map(f => ({ question: f.question, answer: f.answer }))} />
    </div>
  );
}