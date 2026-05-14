import type { Plan } from "@prisma/client";

// User with computed statistics
export interface UserWithStats {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: Plan;
  credits: number;
  createdAt: Date;
  stats: {
    totalAudits: number;
    totalCampaigns: number;
    totalEmailsSent: number;
    averageScore: number;
  };
}

// Plan information
export interface PlanInfo {
  name: Plan;
  displayName: string;
  creditsPerMonth: number;
  maxCampaigns: number;
  maxProspectsPerCampaign: number;
  features: string[];
  price: number | null;
  stripePriceId: string | null;
}

// Credit information
export interface CreditInfo {
  current: number;
  limit: number;
  resetDate: Date | null;
  usedThisPeriod: number;
  remaining: number;
  isExhausted: boolean;
}

// Credit transaction types
export type CreditTransactionType =
  | "audit_deduct"
  | "audit_refund"
  | "batch_bonus"
  | "subscription_grant"
  | "monthly_reset";

export interface CreditTransactionInfo {
  id: string;
  amount: number;
  type: CreditTransactionType;
  auditId: string | null;
  createdAt: Date;
  description: string;
}

// User registration input
export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

// User login input
export interface LoginInput {
  email: string;
  password: string;
}

// User profile update input
export interface UpdateProfileInput {
  name?: string;
  image?: string;
}

// Password change input
export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// Password reset input
export interface ResetPasswordInput {
  token: string;
  password: string;
}

// Session information
export interface SessionInfo {
  userId: string;
  email: string;
  name: string | null;
  plan: Plan;
  credits: number;
  expiresAt: Date;
}

// Default plan configurations
export const DEFAULT_PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    name: Plan.FREE,
    displayName: "Gratuit",
    creditsPerMonth: 5,
    maxCampaigns: 1,
    maxProspectsPerCampaign: 10,
    features: [
      "5 audits par mois",
      "1 campagne",
      "Analyses UX basiques",
      "Emails générés",
    ],
    price: 0,
    stripePriceId: null,
  },
  STARTER: {
    name: Plan.STARTER,
    displayName: "Starter",
    creditsPerMonth: 25,
    maxCampaigns: 3,
    maxProspectsPerCampaign: 50,
    features: [
      "25 audits par mois",
      "3 campagnes",
      "Analyses UX avancées",
      "Emails personnalisés",
      "Support email",
    ],
    price: 29,
    stripePriceId: process.env.STRIPE_PRICE_ID_STARTER ?? null,
  },
  PRO: {
    name: Plan.PRO,
    displayName: "Pro",
    creditsPerMonth: 100,
    maxCampaigns: 10,
    maxProspectsPerCampaign: 200,
    features: [
      "100 audits par mois",
      "Campagnes illimitées",
      "Analyses IA complètes",
      "Emails prioritaires",
      "API access",
      "Support prioritaire",
    ],
    price: 99,
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO ?? null,
  },
  AGENCY: {
    name: Plan.AGENCY,
    displayName: "Agency",
    creditsPerMonth: 500,
    maxCampaigns: -1, // unlimited
    maxProspectsPerCampaign: -1, // unlimited
    features: [
      "500 audits par mois",
      "Campagnes illimitées",
      "Analyses IA complètes",
      "Multi-utilisateurs",
      "White-label",
      "Support dédié",
      "SLA 99.9%",
    ],
    price: 299,
    stripePriceId: process.env.STRIPE_PRICE_ID_AGENCY ?? null,
  },
};

// Helper to check if user can perform action
export function canUserPerformAction(
  credits: number,
  plan: Plan,
  action: "audit" | "campaign" | "batch"
): boolean {
  if (credits <= 0) return false;

  const planInfo = DEFAULT_PLANS[plan];

  switch (action) {
    case "audit":
      return credits >= 1;
    case "campaign":
      return true; // Check specific limits if needed
    case "batch":
      return plan !== Plan.FREE;
    default:
      return false;
  }
}