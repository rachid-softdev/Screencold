import { Plan } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface PlanFeatures {
  analytics: boolean;
  csvExport: boolean;
  emailTemplates: boolean;
  prioritySupport: boolean;
  batchProcessing: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  teamAccess: number;
}

export interface PlanInfo {
  id: Plan;
  name: string;
  credits: number;
  csvLimit: number;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: PlanFeatures;
  popular?: boolean;
  stripePriceId?: string;
}

// ============================================
// Plan Definitions
// ============================================

export const PLANS: Record<Plan, PlanInfo> = {
  FREE: {
    id: 'FREE',
    name: 'Gratuit',
    credits: 5,
    csvLimit: 10,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: 'Pour découvrir ScreenCold et analyser vos premiers sites',
    features: {
      analytics: true,
      csvExport: false,
      emailTemplates: false,
      prioritySupport: false,
      batchProcessing: false,
      apiAccess: false,
      customBranding: false,
      teamAccess: 0,
    },
  },
  STARTER: {
    id: 'STARTER',
    name: 'Starter',
    credits: 50,
    csvLimit: 50,
    monthlyPrice: 49,
    yearlyPrice: 39, // ~20% discount
    description: 'Pour les freelances et petites agences qui débutent',
    features: {
      analytics: true,
      csvExport: true,
      emailTemplates: true,
      prioritySupport: false,
      batchProcessing: false,
      apiAccess: false,
      customBranding: false,
      teamAccess: 1,
    },
    popular: true,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID,
  },
  PRO: {
    id: 'PRO',
    name: 'Pro',
    credits: 500,
    csvLimit: 500,
    monthlyPrice: 149,
    yearlyPrice: 119, // ~20% discount
    description: 'Pour les agences qui traite plusieurs clients',
    features: {
      analytics: true,
      csvExport: true,
      emailTemplates: true,
      prioritySupport: true,
      batchProcessing: true,
      apiAccess: true,
      customBranding: false,
      teamAccess: 5,
    },
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  AGENCY: {
    id: 'AGENCY',
    name: 'Agency',
    credits: -1, // Unlimited
    csvLimit: -1,
    monthlyPrice: 399,
    yearlyPrice: 319, // ~20% discount
    description: 'Pour les grosses structures avec besoins avancés',
    features: {
      analytics: true,
      csvExport: true,
      emailTemplates: true,
      prioritySupport: true,
      batchProcessing: true,
      apiAccess: true,
      customBranding: true,
      teamAccess: -1, // Unlimited
    },
    stripePriceId: process.env.STRIPE_AGENCY_PRICE_ID,
  },
};

// ============================================
// Plan Order (for comparisons)
// ============================================

const PLAN_ORDER: Plan[] = ['FREE', 'STARTER', 'PRO', 'AGENCY'];

const PLAN_INDEX = PLAN_ORDER.reduce((acc, plan, index) => {
  acc[plan] = index;
  return acc;
}, {} as Record<Plan, number>);

// ============================================
// Helper Functions
// ============================================

/**
 * Get plan info by plan ID
 */
export function getPlan(plan: Plan): PlanInfo {
  return PLANS[plan];
}

/**
 * Get all plans as array
 */
export function getAllPlans(): PlanInfo[] {
  return Object.values(PLANS);
}

/**
 * Check if user can upgrade from current plan to target plan
 */
export function canUpgradeTo(current: Plan, target: Plan): boolean {
  return PLAN_INDEX[target] > PLAN_INDEX[current];
}

/**
 * Check if user can downgrade from current plan to target plan
 */
export function canDowngradeTo(current: Plan, target: Plan): boolean {
  return PLAN_INDEX[target] < PLAN_INDEX[current];
}

/**
 * Check if user can switch to target plan (up or down)
 */
export function canUsePlan(current: Plan, target: Plan): boolean {
  return PLAN_INDEX[current] <= PLAN_INDEX[target];
}

/**
 * Get credit limit for a plan (-1 = unlimited)
 */
export function getCSVLimit(plan: Plan): number {
  return PLANS[plan].csvLimit;
}

/**
 * Get monthly credits for a plan (-1 = unlimited)
 */
export function getMonthlyCredits(plan: Plan): number {
  return PLANS[plan].credits;
}

/**
 * Check if a plan is paid
 */
export function isPaidPlan(plan: Plan): boolean {
  return plan !== 'FREE';
}

/**
 * Get plan features
 */
export function getPlanFeatures(plan: Plan): PlanFeatures {
  return PLANS[plan].features;
}

/**
 * Get the next plan upgrade option
 */
export function getNextUpgrade(current: Plan): Plan | null {
  const currentIndex = PLAN_INDEX[current];
  const nextIndex = currentIndex + 1;
  
  if (nextIndex >= PLAN_ORDER.length) {
    return null;
  }
  
  return PLAN_ORDER[nextIndex];
}

/**
 * Calculate savings for yearly vs monthly billing
 */
export function getYearlySavings(monthlyPrice: number): {
  monthlyWithYearly: number;
  yearlySavings: number;
  savingsPercent: number;
} {
  const yearlyPrice = monthlyPrice * 12;
  const yearlySavings = Math.round(yearlyPrice - (yearlyPrice * 0.8)); // 20% off

  return {
    monthlyWithYearly: Math.round(yearlySavings / 12),
    yearlySavings,
    savingsPercent: 20,
  };
}

/**
 * Get plan by price ID (Stripe)
 */
export function getPlanByPriceId(priceId: string): Plan | null {
  for (const [planId, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceId === priceId) {
      return planId as Plan;
    }
  }
  return null;
}

/**
 * Get the Stripe price ID for a plan (yearly or monthly)
 */
export function getStripePriceId(plan: Plan, interval: 'monthly' | 'yearly' = 'monthly'): string | undefined {
  const basePriceId = PLANS[plan].stripePriceId;
  if (!basePriceId) return undefined;

  // In production, you'd have separate yearly price IDs
  // For now, we append a suffix for yearly
  if (interval === 'yearly') {
    return `${basePriceId}_yearly`;
  }
  
  return basePriceId;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Check if user has reached CSV import limit
 */
export function canImportCSV(plan: Plan, csvRowCount: number): {
  canImport: boolean;
  reason?: string;
} {
  const limit = getCSVLimit(plan);
  
  if (limit === -1) {
    return { canImport: true };
  }
  
  if (csvRowCount > limit) {
    return {
      canImport: false,
      reason: `La limite de ${limit} lignes a été atteinte. Mettez à niveau vers ${plan} pour importer plus.`,
    };
  }
  
  return { canImport: true };
}

/**
 * Check if user can perform batch processing
 */
export function canBatchProcess(plan: Plan): boolean {
  return PLANS[plan].features.batchProcessing;
}

/**
 * Check if user has API access
 */
export function canUseAPI(plan: Plan): boolean {
  return PLANS[plan].features.apiAccess;
}

/**
 * Get max team members for a plan (-1 = unlimited)
 */
export function getMaxTeamMembers(plan: Plan): number {
  return PLANS[plan].features.teamAccess;
}