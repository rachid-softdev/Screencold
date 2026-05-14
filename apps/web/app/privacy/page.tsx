import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité - ScreenCold',
  description: 'Politique de confidentialité de ScreenCold',
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-gray-900">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : Mai 2024</p>

        <div className="mt-8 space-y-6 text-gray-600">
          <p>
            La présente politique de confidentialité décrit comment ScreenCold collecte, utilise 
            et protège vos données personnelles conformément au Règlement Général sur la Protection 
            des Données (RGPD).
          </p>

          <h2 className="text-xl font-bold text-gray-900">1. Données collectées</h2>
          <p>
            Nous collectons les données suivantes :
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Données d'inscription</strong> : nom, email, mot de passe (chiffré)</li>
            <li><strong>Données de profil</strong> : photo de profil, plan choisi, crédits</li>
            <li><strong>Données d'utilisation</strong> : audits effectués, emails générés</li>
            <li><strong>Données techniques</strong> : adresse IP, navigateur, appareil</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">2. Utilisation des données</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fournir et améliorer nos services</li>
            <li>Personnaliser votre expérience</li>
            <li>Vous envoyer des communications importantes</li>
            <li>Analyser l'utilisation du service</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">3. Cookies</h2>
          <p>
            Nous utilisons des cookies essentiels pour le fonctionnement du site et des cookies 
            analytiques pour améliorer nos services. Vous pouvez gérer vos préférences cookies 
            à tout moment dans les paramètres de votre navigateur.
          </p>

          <h2 className="text-xl font-bold text-gray-900">4. Conservation des données</h2>
          <p>
            Nous conservons vos données aussi longtemps que votre compte est actif ou aussi longtemps 
            que nécessaire pour vous fournir nos services. Vous pouvez demander la suppression de 
            vos données à tout moment.
          </p>

          <h2 className="text-xl font-bold text-gray-900">5. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
            <li><strong>Droit de rectification</strong> : corriger vos données</li>
            <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
            <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
          </ul>

          <h2 className="text-xl font-bold text-gray-900">6. Sécurité</h2>
          <p>
            Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données 
            contre tout accès non autorisé, alteration, divulgation ou destruction. Toutes les 
            données sensibles sont chiffrées.
          </p>

          <h2 className="text-xl font-bold text-gray-900">7. Contact</h2>
          <p>
            Pour toute question concernant cette politique de confidentialité ou pour exercer 
            vos droits, veuillez nous contacter à : <strong>privacy@screencold.com</strong>
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