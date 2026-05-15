import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Conditions générales d\'utilisation - ScreenCold',
  description: 'CGU de ScreenCold. Consultez nos conditions d\'utilisation, politique de remboursement et obligations respectives.',
  robots: { index: true, follow: true },
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
        <h1 className="text-3xl font-bold text-gray-900">Conditions générales d'utilisation</h1>
        <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : Mai 2026</p>

        <div className="mt-8 space-y-8 text-gray-600">
          <p>
            Les présentes conditions générales d'utilisation (« CGU ») constituent un accord
            légal entre vous (« Utilisateur ») et ScreenCold (« nous », « notre »). En utilisant
            notre service, vous acceptez d'être lié par ces CGU.
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900">1. Définitions</h2>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Service</strong> : la plateforme ScreenCold accessible à screencold.com</li>
              <li><strong>Utilisateur</strong> : toute personne physique ou morale qui s'inscrit et utilise le Service</li>
              <li><strong>Audit</strong> : l'analyse d'un site web et la génération d'un email de prospection</li>
              <li><strong>Crédit</strong> : unité de consommation permettant de lancer un Audit</li>
              <li><strong>Contenu</strong> : les données, textes, images et emails générés par le Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">2. Objet</h2>
            <p className="mt-3">
              ScreenCold est un service SaaS permettant l'automatisation d'audits de sites web
              et la génération d'emails de prospection personnalisés. Le Service est fourni en
              mode cloud (SaaS) et accessible via un navigateur web.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">3. Accès au Service</h2>
            <p className="mt-3">
              Pour utiliser le Service, vous devez créer un compte avec une adresse email valide.
              Vous êtes responsable de maintenir la confidentialité de vos identifiants. Vous êtes
              responsable de toutes les activités effectuées sous votre compte.
            </p>
            <p className="mt-3">
              Le plan Gratuit offre 5 crédits par mois. Les plans payants (Starter, Pro, Agency)
              offrent des crédits mensuels supplémentaires selon le plan choisi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">4. Tarifs et paiement</h2>
            <p className="mt-3">
              Les tarifs sont indiqués sur la page <Link href="/pricing" className="text-blue-600 hover:underline">/pricing</Link>.
              Les paiements sont traités par Stripe. Les abonnements sont facturés mensuellement
              ou annuellement selon l'option choisie.
            </p>
            <p className="mt-3">
              <strong>Essai gratuit :</strong> Les plans payants offrent un essai gratuit de 14 jours.
              Aucune carte bancaire n'est requise pour l'essai. À la fin de l'essai, vous devez
              saisir vos coordonnées bancaires pour continuer.
            </p>
            <p className="mt-3">
              <strong>Remboursement :</strong> Les crédits consommés pour des audits réussis ne sont
              pas remboursables. Les crédits débités pour des audits échoués (site inaccessible,
              timeout) sont automatiquement remboursés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">5. Crédits</h2>
            <p className="mt-3">
              Chaque audit consomme 1 crédit. Les crédits sont renouvelés chaque mois à la date
              d'anniversaire de votre abonnement. Les crédits non utilisés ne sont pas reportés
              au mois suivant.
            </p>
            <p className="mt-3">
              Vous pouvez acheter des crédits supplémentaires à tout moment. Les crédits
              supplémentaires n'expirent pas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">6. Utilisation acceptable</h2>
            <p className="mt-3">Vous acceptez de ne pas :</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>Utiliser le Service à des fins illégales ou non autorisées</li>
              <li>Soumettre des URLs pointant vers des réseaux internes, localhost ou des adresses IP privées</li>
              <li>Utiliser le Service pour du spam, du phishing ou toute activité malveillante</li>
              <li>Tenter de compromettre la sécurité du Service (injection, SSRF, DDoS)</li>
              <li>Revendre ou redistribuer le Service sans autorisation écrite</li>
              <li>Automatiser l'utilisation du Service via des scripts non autorisés</li>
              <li>Partager vos identifiants de compte avec des tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">7. Propriété intellectuelle</h2>
            <p className="mt-3">
              Le Service et son contenu (code, design, logo, documentation) sont la propriété
              exclusive de ScreenCold et sont protégés par les lois sur la propriété intellectuelle.
            </p>
            <p className="mt-3">
              Vous conservez la pleine propriété des données que vous soumettez au Service.
              Vous nous accordez une licence limitée pour traiter vos données dans le cadre
              de la fourniture du Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">8. Limitation de responsabilité</h2>
            <p className="mt-3">
              Le Service est fourni « en l'état » sans garantie d'aucune sorte. Nous ne garantissons
              pas que le Service sera ininterrompu, sans erreur ou parfaitement sécurisé.
            </p>
            <p className="mt-3">
              En aucun cas, ScreenCold ne sera responsable des dommages indirects, accessoires,
              spéciaux ou consécutifs découlant de l'utilisation ou de l'impossibilité d'utiliser
              le Service. Notre responsabilité totale est limitée au montant payé par vous au
              cours des 12 derniers mois.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">9. Résiliation</h2>
            <p className="mt-3">
              Vous pouvez supprimer votre compte à tout moment depuis vos paramètres. Nous pouvons
              suspendre ou résilier votre accès si vous violez ces CGU.
            </p>
            <p className="mt-3">
              En cas de résiliation, vos données seront supprimées dans un délai de 30 jours,
              sauf si la loi nous oblige à les conserver (factures : 10 ans).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">10. Modifications</h2>
            <p className="mt-3">
              Nous nous réservons le droit de modifier ces CGU à tout moment. Les modifications
              substantielles vous seront notifiées par email 30 jours avant leur entrée en vigueur.
              Votre utilisation continue du Service après notification constitue votre acceptation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">11. Droit applicable et juridiction</h2>
            <p className="mt-3">
              Ces CGU sont régies par le droit français. Tout litige sera soumis à la compétence
              exclusive des tribunaux de Paris, sauf disposition légale contraire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900">12. Contact</h2>
            <p className="mt-3">
              Pour toute question concernant ces CGU, contactez-nous à :
              <strong> legal@screencold.com</strong>
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-gray-500">© 2026 ScreenCold. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
