import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding entitlements...');

  // ============================================
  // Create Plans
  // ============================================

  const plans = [
    {
      key: 'FREE',
      name: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      isActive: true,
      sortOrder: 0,
    },
    {
      key: 'STARTER',
      name: 'Starter',
      priceMonthly: 49,
      priceYearly: 470,
      isActive: true,
      sortOrder: 1,
    },
    {
      key: 'PRO',
      name: 'Pro',
      priceMonthly: 149,
      priceYearly: 1430,
      isActive: true,
      sortOrder: 2,
    },
    {
      key: 'AGENCY',
      name: 'Agency',
      priceMonthly: 399,
      priceYearly: 3830,
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const plan of plans) {
    await prisma.planConfig.upsert({
      where: { key: plan.key },
      create: plan,
      update: plan,
    });
  }

  console.log('Plans created');

  // ============================================
  // Create Features
  // ============================================

  const features = [
    // Boolean features
    {
      key: 'ANALYTICS',
      description: 'View analytics dashboard and reports',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'CSV_EXPORT',
      description: 'Export data to CSV format',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'EMAIL_TEMPLATES',
      description: 'Create and manage custom email templates',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'PRIORITY_SUPPORT',
      description: 'Get priority support from the team',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'BATCH_PROCESSING',
      description: 'Process multiple audits at once',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'API_ACCESS',
      description: 'Access API for integrations',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'CUSTOM_BRANDING',
      description: 'Custom branding on reports',
      type: 'BOOLEAN' as const,
      defaultConfig: null,
      isActive: true,
    },
    // Limit features
    {
      key: 'AUDITS_PER_MONTH',
      description: 'Number of audits per month',
      type: 'LIMIT' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'TEAM_MEMBERS',
      description: 'Number of team members',
      type: 'LIMIT' as const,
      defaultConfig: null,
      isActive: true,
    },
    {
      key: 'CAMPAIGNS',
      description: 'Number of email campaigns',
      type: 'LIMIT' as const,
      defaultConfig: null,
      isActive: true,
    },
    // Experiment features
    {
      key: 'NEW_DASHBOARD',
      description: 'New dashboard redesign (A/B test)',
      type: 'EXPERIMENT' as const,
      defaultConfig: { percentage: 50, seed: 'NEW_DASHBOARD_v1' },
      isActive: true,
    },
    {
      key: 'AI_SUMMARY',
      description: 'AI-powered summary generation (A/B test)',
      type: 'EXPERIMENT' as const,
      defaultConfig: { percentage: 25, seed: 'AI_SUMMARY_beta' },
      isActive: true,
    },
  ];

  for (const feature of features) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      create: feature,
      update: feature,
    });
  }

  console.log('Features created');

  // ============================================
  // Create Plan-Feature Mappings
  // ============================================

  const planFeatures = [
    // FREE Plan
    { planKey: 'FREE', featureKey: 'ANALYTICS', enabled: true, limitValue: null },
    { planKey: 'FREE', featureKey: 'CSV_EXPORT', enabled: false, limitValue: null },
    { planKey: 'FREE', featureKey: 'EMAIL_TEMPLATES', enabled: false, limitValue: null },
    { planKey: 'FREE', featureKey: 'PRIORITY_SUPPORT', enabled: false, limitValue: null },
    { planKey: 'FREE', featureKey: 'BATCH_PROCESSING', enabled: false, limitValue: null },
    { planKey: 'FREE', featureKey: 'API_ACCESS', enabled: false, limitValue: null },
    { planKey: 'FREE', featureKey: 'CUSTOM_BRANDING', enabled: false, limitValue: null },
    { planKey: 'FREE', featureKey: 'AUDITS_PER_MONTH', enabled: true, limitValue: 5 },
    { planKey: 'FREE', featureKey: 'TEAM_MEMBERS', enabled: true, limitValue: 1 },
    { planKey: 'FREE', featureKey: 'CAMPAIGNS', enabled: true, limitValue: 1 },
    { planKey: 'FREE', featureKey: 'NEW_DASHBOARD', enabled: true, limitValue: null },
    { planKey: 'FREE', featureKey: 'AI_SUMMARY', enabled: false, limitValue: null },

    // STARTER Plan
    { planKey: 'STARTER', featureKey: 'ANALYTICS', enabled: true, limitValue: null },
    { planKey: 'STARTER', featureKey: 'CSV_EXPORT', enabled: true, limitValue: 50 },
    { planKey: 'STARTER', featureKey: 'EMAIL_TEMPLATES', enabled: true, limitValue: null },
    { planKey: 'STARTER', featureKey: 'PRIORITY_SUPPORT', enabled: false, limitValue: null },
    { planKey: 'STARTER', featureKey: 'BATCH_PROCESSING', enabled: false, limitValue: null },
    { planKey: 'STARTER', featureKey: 'API_ACCESS', enabled: false, limitValue: null },
    { planKey: 'STARTER', featureKey: 'CUSTOM_BRANDING', enabled: false, limitValue: null },
    { planKey: 'STARTER', featureKey: 'AUDITS_PER_MONTH', enabled: true, limitValue: 50 },
    { planKey: 'STARTER', featureKey: 'TEAM_MEMBERS', enabled: true, limitValue: 2 },
    { planKey: 'STARTER', featureKey: 'CAMPAIGNS', enabled: true, limitValue: 5 },
    { planKey: 'STARTER', featureKey: 'NEW_DASHBOARD', enabled: true, limitValue: null },
    { planKey: 'STARTER', featureKey: 'AI_SUMMARY', enabled: true, limitValue: null },

    // PRO Plan
    { planKey: 'PRO', featureKey: 'ANALYTICS', enabled: true, limitValue: null },
    { planKey: 'PRO', featureKey: 'CSV_EXPORT', enabled: true, limitValue: 500 },
    { planKey: 'PRO', featureKey: 'EMAIL_TEMPLATES', enabled: true, limitValue: null },
    { planKey: 'PRO', featureKey: 'PRIORITY_SUPPORT', enabled: true, limitValue: null },
    { planKey: 'PRO', featureKey: 'BATCH_PROCESSING', enabled: true, limitValue: null },
    { planKey: 'PRO', featureKey: 'API_ACCESS', enabled: true, limitValue: null },
    { planKey: 'PRO', featureKey: 'CUSTOM_BRANDING', enabled: false, limitValue: null },
    { planKey: 'PRO', featureKey: 'AUDITS_PER_MONTH', enabled: true, limitValue: 500 },
    { planKey: 'PRO', featureKey: 'TEAM_MEMBERS', enabled: true, limitValue: 5 },
    { planKey: 'PRO', featureKey: 'CAMPAIGNS', enabled: true, limitValue: 20 },
    { planKey: 'PRO', featureKey: 'NEW_DASHBOARD', enabled: true, limitValue: null },
    { planKey: 'PRO', featureKey: 'AI_SUMMARY', enabled: true, limitValue: null },

    // AGENCY Plan (unlimited)
    { planKey: 'AGENCY', featureKey: 'ANALYTICS', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'CSV_EXPORT', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'EMAIL_TEMPLATES', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'PRIORITY_SUPPORT', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'BATCH_PROCESSING', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'API_ACCESS', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'CUSTOM_BRANDING', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'AUDITS_PER_MONTH', enabled: true, limitValue: null }, // null = unlimited
    { planKey: 'AGENCY', featureKey: 'TEAM_MEMBERS', enabled: true, limitValue: null }, // null = unlimited
    { planKey: 'AGENCY', featureKey: 'CAMPAIGNS', enabled: true, limitValue: null }, // null = unlimited
    { planKey: 'AGENCY', featureKey: 'NEW_DASHBOARD', enabled: true, limitValue: null },
    { planKey: 'AGENCY', featureKey: 'AI_SUMMARY', enabled: true, limitValue: null },
  ];

  for (const pf of planFeatures) {
    const plan = await prisma.planConfig.findUnique({ where: { key: pf.planKey } });
    const feature = await prisma.feature.findUnique({ where: { key: pf.featureKey } });

    if (plan && feature) {
      await prisma.planConfigFeature.upsert({
        where: {
          planId_featureId: { planId: plan.id, featureId: feature.id },
        },
        create: {
          planId: plan.id,
          featureId: feature.id,
          enabled: pf.enabled,
          limitValue: pf.limitValue,
        },
        update: {
          enabled: pf.enabled,
          limitValue: pf.limitValue,
        },
      });
    }
  }

  console.log('Plan-Feature mappings created');

  console.log('Entitlements seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });