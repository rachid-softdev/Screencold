/**
 * Email Sequences Service
 * Handles automated email sequences for new users (onboarding, engagement)
 */

import { prisma } from "../db";
import { sendEmail, sendWelcomeEmail, sendAuditCompleteEmail, sendLowCreditsEmail } from "./email";
import { createLogger } from "../utils/logger";

const logger = createLogger();

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
    subject: "Comment un client a augmenté son taux de réponse de 40%",
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

Avec le plan Starter (49€/mois), vous obtenez :
- 50 crédits/mois
- Export CSV
- Support prioritaire

Avec le plan Pro (149€/mois) :
- 500 crédits/mois
- Campagnes illimitées
- Accès API

Voir les tarifs : {{pricingUrl}}

L'équipe ScreenCold`,
    delayDays: 7,
  },
];

interface SentEmailLog {
  userId: string;
  emailType: string;
  sentAt: Date;
}

// Store sent emails in memory (in production, use DB)
const sentEmails: Map<string, SentEmailLog[]> = new Map();

/**
 * Send a specific email in the sequence
 */
async function sendSequenceEmail(
  userId: string,
  userEmail: string,
  userName: string,
  template: EmailTemplate,
  creditsUsed: number,
  totalCredits: number
): Promise<boolean> {
  try {
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` 
      : 'https://screencold.com/dashboard';
    const pricingUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/pricing` 
      : 'https://screencold.com/pricing';

    // Replace variables
    let subject = template.subject.replace(/{{name}}/g, userName || 'Client');
    let body = template.body
      .replace(/{{name}}/g, userName || 'Client')
      .replace(/{{creditsUsed}}/g, creditsUsed.toString())
      .replace(/{{totalCredits}}/g, totalCredits.toString())
      .replace(/{{dashboardUrl}}/g, dashboardUrl)
      .replace(/{{pricingUrl}}/g, pricingUrl);

    const result = await sendEmail({
      to: userEmail,
      subject,
      html: body.replace(/\n/g, '<br>'),
    });

    // Log sent email
    const existing = sentEmails.get(userId) || [];
    existing.push({
      userId,
      emailType: subject,
      sentAt: new Date(),
    });
    sentEmails.set(userId, existing);

    logger.info('Sequence email sent', { userId, subject, delayDays: template.delayDays });
    return result.success;
  } catch (error) {
    logger.error('Failed to send sequence email', { 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown' 
    });
    return false;
  }
}

/**
 * Check and send pending sequence emails
 * Should be called periodically (e.g., every hour via cron)
 */
export async function processEmailSequences(): Promise<void> {
  logger.info('Processing email sequences...');

  try {
    // Get all users who signed up in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        plan: true,
        createdAt: true,
      },
    });

    logger.info('Checking email sequences for users', { userCount: recentUsers.length });

    for (const user of recentUsers) {
      const userSentEmails = sentEmails.get(user.id) || [];
      const daysSinceSignup = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check each email in the sequence
      for (const template of postSignupSequence) {
        // Skip if already sent
        const alreadySent = userSentEmails.some(log => log.emailType === template.subject);
        if (alreadySent) continue;

        // Send if it's time (within 1 hour window)
        if (daysSinceSignup >= template.delayDays && daysSinceSignup < template.delayDays + 1) {
          const creditsUsed = 5 - user.credits;
          await sendSequenceEmail(
            user.id,
            user.email,
            user.name || 'Client',
            template,
            creditsUsed,
            user.credits
          );
        }
      }
    }

    logger.info('Email sequences processed successfully');
  } catch (error) {
    logger.error('Error processing email sequences', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

/**
 * Send low credits notification
 */
export async function checkAndNotifyLowCredits(): Promise<void> {
  logger.info('Checking for users with low credits...');

  try {
    // Find users with low credits (less than 2) who are on free plan
    const usersWithLowCredits = await prisma.user.findMany({
      where: {
        credits: { lte: 2 },
        plan: 'FREE',
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
      },
    });

    for (const user of usersWithLowCredits) {
      // Check if already notified recently (skip if notified in last 7 days)
      const userSentEmails = sentEmails.get(user.id) || [];
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      const recentLowCreditsNotification = userSentEmails.some(
        log => log.emailType.includes('crédits') && log.sentAt.getTime() > sevenDaysAgo
      );

      if (!recentLowCreditsNotification) {
        await sendLowCreditsEmail(user.email, user.credits);
        
        // Log the notification
        const existing = sentEmails.get(user.id) || [];
        existing.push({
          userId: user.id,
          emailType: 'Low credits notification',
          sentAt: new Date(),
        });
        sentEmails.set(user.id, existing);
        
        logger.info('Low credits notification sent', { userId: user.id, credits: user.credits });
      }
    }

    logger.info('Low credits check completed', { usersNotified: usersWithLowCredits.length });
  } catch (error) {
    logger.error('Error checking low credits', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

export default {
  processEmailSequences,
  checkAndNotifyLowCredits,
};