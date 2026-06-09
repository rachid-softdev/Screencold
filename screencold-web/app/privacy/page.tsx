import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Politique de confidentialité - ScreenCold',
  description: 'Politique de confidentialité de ScreenCold. Découvrez comment nous protégeons vos données conformément au RGPD.',
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold text-neutral-900">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-neutral-500">Dernière mise à jour : Mai 2026</p>

        <div className="mt-8 space-y-8 text-neutral-600">
          <p>
            La présente politique de confidentialité décrit comment ScreenCold collecte, utilise
            et protège vos données personnelles conformément au Règlement Général sur la Protection
            des Données (RGPD - Règlement UE 2016/679).
          </p>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">1. Responsable du traitement</h2>
            <p className="mt-3">
              Le responsable du traitement des données personnelles est ScreenCold,
              joignable à l'adresse : <strong>privacy@screencold.com</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">2. Données collectées</h2>
            <p className="mt-3">Nous collectons les données suivantes :</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Données d'inscription</strong> : nom, email, mot de passe (hashé bcrypt)</li>
              <li><strong>Données de profil</strong> : photo de profil, plan choisi, crédits</li>
              <li><strong>Données d'utilisation</strong> : audits effectués, emails générés, URLs analysées</li>
              <li><strong>Données techniques</strong> : adresse IP, navigateur, appareil, pages visitées</li>
              <li><strong>Données de paiement</strong> : gérées par Stripe (nous ne stockons pas vos coordonnées bancaires)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">3. Utilisation des données</h2>
            <p className="mt-3">Vos données sont utilisées pour :</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>Fournir et améliorer nos services (audits, génération d'emails)</li>
              <li>Personnaliser votre expérience utilisateur</li>
              <li>Vous envoyer des communications importantes (facturation, sécurité)</li>
              <li>Analyser l'utilisation du service pour améliorer le produit</li>
              <li>Assurer la sécurité de votre compte et prévenir la fraude</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">4. Cookies et technologies similaires</h2>
            <p className="mt-3">
              Nous utilisons différents types de cookies :
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-neutral-50 p-4">
                <h3 className="font-semibold text-neutral-900">Cookies strictement nécessaires</h3>
                <p className="mt-1 text-sm">
                  Indispensables au fonctionnement du site. Ils permettent l'authentification,
                  la sécurité de session et l'accès aux zones protégées. Ces cookies ne peuvent
                  pas être désactivés.
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Durée : session navigateur à 30 jours
                </p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <h3 className="font-semibold text-neutral-900">Cookies analytiques</h3>
                <p className="mt-1 text-sm">
                  Nous aident à comprendre comment vous utilisez ScreenCold (pages visitées,
                  temps passé, parcours utilisateur). Ces données sont anonymisées et utilisées
                  uniquement pour améliorer le service.
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Durée : 13 mois. Soumis à votre consentement.
                </p>
              </div>
              <div className="rounded-lg bg-neutral-50 p-4">
                <h3 className="font-semibold text-neutral-900">Cookies marketing</h3>
                <p className="mt-1 text-sm">
                  Utilisés pour vous proposer des publicités pertinentes et mesurer l'efficacité
                  de nos campagnes. Ces cookies sont posés par des tiers (Google, Meta) et
                  nécessitent votre consentement explicite.
                </p>
                <p className="mt-2 text-xs text-neutral-500">
                  Durée : 13 mois. Soumis à votre consentement.
                </p>
              </div>
            </div>
            <p className="mt-4">
              Vous pouvez modifier vos préférences cookies à tout moment via le bandeau de consentement
              ou en nous contactant à <strong>privacy@screencold.com</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">5. Base légale du traitement</h2>
            <p className="mt-3">Nous traitons vos données sur les bases légales suivantes :</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Exécution du contrat</strong> : pour fournir le service ScreenCold</li>
              <li><strong>Consentement</strong> : pour les cookies analytiques et marketing</li>
              <li><strong>Intérêt légitime</strong> : pour la sécurité et l'amélioration du service</li>
              <li><strong>Obligation légale</strong> : pour la facturation et la conformité fiscale</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">6. Destinataires des données</h2>
            <p className="mt-3">Vos données peuvent être partagées avec :</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Stripe</strong> : traitement des paiements (certifié PCI DSS)</li>
              <li><strong>Anthropic</strong> : analyse d'images par IA (Claude Vision)</li>
              <li><strong>AWS S3 / Cloudflare R2</strong> : stockage des screenshots</li>
              <li><strong>Resend</strong> : envoi d'emails transactionnels</li>
            </ul>
            <p className="mt-3">
              Ces sous-tracteurs sont situés aux États-Unis et sont conformes au RGPD
              via des clauses contractuelles types (CCT).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">7. Conservation des données</h2>
            <p className="mt-3">
              Nous conservons vos données aussi longtemps que votre compte est actif.
              Après suppression de votre compte, vos données sont supprimées dans un délai
              de 30 jours, sauf obligation légale de conservation (factures : 10 ans).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">8. Vos droits</h2>
            <p className="mt-3">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li><strong>Droit d'accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> : corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données</li>
              <li><strong>Droit à la limitation</strong> : limiter le traitement de vos données</li>
              <li><strong>Droit d'opposition</strong> : vous opposer au traitement de vos données</li>
              <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré</li>
              <li><strong>Droit de retrait du consentement</strong> : retirer votre consentement à tout moment</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, contactez-nous à <strong>privacy@screencold.com</strong>.
              Nous répondrons dans un délai de 30 jours. En cas de litige, vous pouvez saisir la CNIL.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">9. Sécurité</h2>
            <p className="mt-3">
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données :
            </p>
            <ul className="mt-3 list-disc pl-6 space-y-2">
              <li>Chiffrement HTTPS/TLS pour toutes les communications</li>
              <li>Hashage bcrypt des mots de passe</li>
              <li>Protection SSRF sur toutes les URLs utilisateur</li>
              <li>Rate limiting sur les endpoints API</li>
              <li>Audit logs sur les actions sensibles</li>
              <li>Sauvegardes chiffrées quotidiennes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-neutral-900">10. Contact</h2>
            <p className="mt-3">
              Pour toute question concernant cette politique de confidentialité ou pour exercer
              vos droits, veuillez nous contacter à : <strong>privacy@screencold.com</strong>
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-500">© 2026 ScreenCold. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
