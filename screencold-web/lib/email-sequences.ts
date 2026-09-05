interface EmailTemplate {
  subject: string;
  body: string;
  delayDays: number;
}

export const postSignupSequence: EmailTemplate[] = [
  {
    subject: "Bienvenue sur ScreenCold ! Voici comment commencer",
    body: `Bonjour {{name}},

Bienvenue sur ScreenCold !

Vous avez reçu 5 crédits gratuits pour découvrir notre service.

Voici comment faire votre premier audit :
1. Connectez-vous à votre dashboard
2. Entrez l'URL d'un site prospect
3. Cliquez sur "Analyser"

En 30 secondes, vous aurez un rapport complet et un email de prospection prêt à envoyer.

Commencer maintenant : {{dashboardUrl}}

L'équipe ScreenCold`,
    delayDays: 0,
  },
  {
    subject: "Astuce : les URLs les plus efficaces pour vos audits",
    body: `Bonjour {{name}},

Voici une astuce pour tirer le meilleur parti de ScreenCold :

Ciblez les sites qui ont un fort trafic mais une conversion faible. Ce sont vos meilleures opportunités.

Exemples de cibles idéales :
- Sites e-commerce avec un design daté
- Landing pages SaaS sans CTA clair
- Sites de services avec un formulaire complexe

Chaque audit vous donne un score de conversion et des recommandations concrètes.

Voir vos audits : {{dashboardUrl}}

L'équipe ScreenCold`,
    delayDays: 1,
  },
  {
    subject: "Astuce : mentionnez des preuves visuelles dans vos emails",
    body: `Bonjour {{name}},

Un email de prospection est plus convaincant quand il s'appuie sur des observations concrètes du site du prospect.

Notre recommandation :
1. Auditez le site avec ScreenCold
2. Reprenez 2 ou 3 problèmes identifiés dans votre audit
3. Rédigez un email court qui cite ces problèmes précis

Le prospect voit que vous vous êtes intéressé à SON site, pas à un template générique.

Voir vos audits : {{dashboardUrl}}

L'équipe ScreenCold`,
    delayDays: 3,
  },
  {
    subject: "Votre essai avance — voici ce que vous ratez",
    body: `Bonjour {{name}},

Vous avez utilisé {{creditsUsed}} de vos {{totalCredits}} crédits.

Avec le plan Starter (49€/mois), vous obtenez :
- 50 crédits/mois
- Export CSV
- Templates d'emails

Avec le plan Pro (149€/mois) :
- 500 crédits/mois
- Batch processing
- Accès API

Voir les tarifs : {{pricingUrl}}

L'équipe ScreenCold`,
    delayDays: 7,
  },
];

export function renderEmail(
  template: EmailTemplate,
  variables: Record<string, string>,
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(placeholder, value);
    body = body.replace(placeholder, value);
  }

  return { subject, body };
}
