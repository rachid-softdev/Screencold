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
    subject: "Comment {{customer}} a augmenté son taux de réponse de 40%",
    body: `Bonjour {{name}},

Thomas, commercial dans une agence web, utilise ScreenCold depuis 3 mois.

Résultat : son taux de réponse aux emails de prospection a augmenté de 40%.

Son secret ? Il envoie des emails ultra-personnalisés basés sur les problèmes concrets identifiés par notre IA.

"Avant, je passais 20 minutes à analyser chaque site. Maintenant, c'est 30 secondes."

Découvrez comment ScreenCold peut transformer votre prospection.

L'équipe ScreenCold`,
    delayDays: 3,
  },
  {
    subject: "Votre essai avance — voici ce que vous ratez",
    body: `Bonjour {{name}},

Vous avez utilisé {{creditsUsed}} de vos {{totalCredits}} crédits.

Avec le plan Starter (29€/mois), vous obtenez :
- 50 crédits/mois
- Export CSV
- Support prioritaire

Avec le plan Pro (79€/mois) :
- 200 crédits/mois
- Campagnes illimitées
- Accès API

Voir les tarifs : {{pricingUrl}}

L'équipe ScreenCold`,
    delayDays: 7,
  },
];

export function renderEmail(
  template: EmailTemplate,
  variables: Record<string, string>
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
