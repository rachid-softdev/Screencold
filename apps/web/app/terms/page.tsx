import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation - ScreenCold',
  description: 'Conditions d\'utilisation de ScreenCold',
};

export default function TermsPage() {
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
          </div>
        </nav>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Conditions d'utilisation</h1>
        <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : Mai 2024</p>

        <div className="mt-8 space-y-6 text-gray-600">
          <p>
            Les présentes conditions d'utilisation (« Conditions ») constituent un accord 
            entre vous (« Utilisateur ») et ScreenCold (« nous », « notre »). En utilisant 
            notre service, vous acceptez d'être lié par ces Conditions.
          </p>

          <h2 className="text-xl font-bold text-gray-900">1. Définitions</h2>
          <p>
            « Service » désigne la plateforme ScreenCold permettant l'analyse de sites web 
            et la génération d'emails de prospection. « Utilisateur » désigne toute personne 
            qui s'inscrit et utilise le Service. « Contenu » désigne les données, textes, 
            images et autres informations générées par le Service.
          </p>

          <h2 className="text-xl font-bold text-gray-900">2. Accès au Service</h2>
          <p>
            Pour utiliser le Service, vous devez créer un compte. Vous êtes responsable de 
            maintenir la confidentialité de votre compte et mot de passe. Vous êtes responsable 
            de toutes les activités effectuées sous votre compte. Nous nous réservons le droit 
            de suspendre ou终止 votre compte si nous soupçonnons une violation des Conditions.
          </p>

          <h2 className="text-xl font-bold text-gray-900">3. Utilisation acceptable</h2>
          <p>Vous acceptez de ne pas :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Utiliser le Service de manière illégale</li>
            <li>Violer les droits d'autrui</li>
            <li>Tenter de compromettre la sécurité du Service</li>
            <li>Utiliser le Service pour du spam ou du phishing</li>
            <li>Automatiser l'utilisation sans autorisation écrite</li>
            <li>Redistribuer le contenu sans permission</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">4. Propriété intellectuelle</h2>
          <p>
            Le Service et son contenu exclusif sont protégés par les lois sur la propriété 
            intellectuelle. Vous conservez la propriété de vos données, mais vous nous accordez 
            une licence pour les utiliser afin de fournir le Service. Vous êtes responsable de 
            vous assurer que vous avez le droit d'utiliser tout contenu que vous soumettez au Service.
          </p>

          <h2 className="text-xl font-bold text-gray-900">5. Limitations de responsabilité</h2>
          <p>
            Le Service est fourni « en l'état ». Nous ne garantissons pas que le Service sera 
            sans erreur ou disponible. En aucun cas, nous ne serions responsables pour tout dommage 
            indirect, accidentel, spécial ou consécutif découlant de l'utilisation du Service.
          </p>

          <h2 className="text-xl font-bold text-gray-900">6. Abonnement et paiement</h2>
          <p>
            Les plans payants sont facturés mensuellement. Vous pouvez annuler votre abonnement 
            à tout moment depuis votre espace client. Si vous annulez, vous garderez l'accès 
            jusqu'à la fin de votre période de facturation. Nous nous réservons le droit de 
            modifier les prix à tout moment avec un préavis de 30 jours.
          </p>

          <h2 className="text-xl font-bold text-gray-900">7. Résiliation</h2>
          <p>
            Vous pouvez supprimer votre compte à tout moment. Nous pouvons suspendre ou终止 
            votre accès au Service si vous violatez ces Conditions. En cas de résiliation, 
            vos données seront supprimées dans un délai de 30 jours, sauf si la loi nous 
            oblige à les conserver.
          </p>

          <h2 className="text-xl font-bold text-gray-900">8. Modifications</h2>
          <p>
            Nous nous réservons le droit de modifier ces Conditions à tout moment. Les modifications 
            entrent en vigueur dès leur publication. Votre utilisation continue du Service après 
            modifications constitue votre acceptation des nouvelles Conditions.
          </p>

          <h2 className="text-xl font-bold text-gray-900">9. Droit applicable</h2>
          <p>
            Ces Conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux 
            de Paris.
          </p>

          <h2 className="text-xl font-bold text-gray-900">10. Contact</h2>
          <p>
            Pour toute question concernant ces Conditions, veuillez nous contacter à : 
            <strong>legal@screencold.com</strong>
          </p>
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