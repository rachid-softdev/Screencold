import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { handleStripeWebhook, ensureEntitlementsInitialized } from '@/lib/entitlements';
import { PrismaEntitlementRepository } from '@/lib/entitlements/repository';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  // First, verify the webhook signature
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('[StripeWebhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Handle checkout.session.completed (credits + subscriptions)
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
    }

    // Handle subscription-related events through entitlements system
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      await ensureEntitlementsInitialized();
      const repo = new PrismaEntitlementRepository(prisma);
      await handleStripeWebhook(repo, body, signature);
    }

    // Legacy: Handle invoice.paid for credits (backward compatibility)
    if (event.type === 'invoice.paid') {
      // Already handled above for subscriptions
      // Only handle legacy credits here if not part of subscription
    }

    console.log(`[StripeWebhook] Processed event: ${event.type}`);
  } catch (err) {
    console.error('[StripeWebhook] Handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Handle checkout session completed - creates/updates subscriptions and adds credits
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const metadata = session.metadata || {};

  // Find user by stripe customer id
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.log('[StripeWebhook] User not found for customer:', customerId);
    return;
  }

  // Handle credits purchase (one-time payment)
  if (metadata.type === 'CREDITS_PURCHASE') {
    const credits = parseInt(metadata.credits || '0', 10);

    if (credits > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: credits },
        },
      });

      // Record transaction
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: credits,
          type: 'PURCHASE',
        },
      });

      console.log(`[StripeWebhook] Added ${credits} credits to user ${user.id}`);
    }
    return;
  }

  // Handle subscription (plan upgrade)
  const plan = metadata.plan || 'STARTER';
  const credits = parseInt(metadata.credits || '50', 10);

  // Update user plan
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: plan as any,
      stripeSubscriptionId: subscriptionId,
      credits: { increment: credits },
      creditsResetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Record transaction
  await prisma.creditTransaction.create({
    data: {
      userId: user.id,
      amount: credits,
      type: 'PURCHASE',
    },
  });

  // Also update/create organization subscription
  // This integrates with the new entitlements system
  try {
    const userOrg = await prisma.userOrganization.findFirst({
      where: { userId: user.id },
    });

    if (userOrg) {
      await prisma.subscription.upsert({
        where: { id: userOrg.orgId },
        create: {
          id: userOrg.orgId,
          orgId: userOrg.orgId,
          planKey: plan,
          status: 'active',
          stripeSubId: subscriptionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          planKey: plan,
          status: 'active',
          stripeSubId: subscriptionId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }
  } catch (err) {
    console.error('[StripeWebhook] Error updating org subscription:', err);
  }

  console.log(`[StripeWebhook] Subscription created for user ${user.id}: ${plan}`);
}