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

  // ============================================
  // Idempotency Check
  // ============================================
  // Before processing any event, check if it has already been processed.
  // Stripe may send the same event multiple times (network retries).
  // Without this check, a user could be credited twice for the same payment.
  try {
    const existingEvent = await prisma.stripeEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existingEvent) {
      if (existingEvent.processed) {
        // Already processed — return 200 as Stripe expects a success response
        // for duplicate events (it's just confirming delivery).
        console.log(
          `[StripeWebhook] Event ${event.id} (${event.type}) already processed, skipping`
        );
        return NextResponse.json({ received: true, idempotent: true });
      }
      // Edge case: event exists but wasn't marked processed
      // This could happen if the previous processing crashed after creating the record.
      // We'll reprocess below and mark it complete.
      console.log(
        `[StripeWebhook] Event ${event.id} exists but unprocessed, reprocessing...`
      );
    }
  } catch (err) {
    console.error('[StripeWebhook] Idempotency check error:', err);
    // If we can't check the DB, return 500 so Stripe retries later (safer than duplicate processing).
    return NextResponse.json({ error: 'Idempotency check failed' }, { status: 500 });
  }

  try {
    // Process the event, wrapped in a transaction for atomicity.
    // Note: the entitlements webhook handler (handleStripeWebhook) uses its own
    // Prisma connection internally via PrismaEntitlementRepository. For full
    // atomicity, this would need to be refactored to accept a transaction client.
    // The idempotency check above still prevents duplicate processing.
    await prisma.$transaction(async (tx) => {
      // Create or update the StripeEvent record
      await tx.stripeEvent.upsert({
        where: { eventId: event.id },
        create: {
          eventId: event.id,
          type: event.type,
          data: event.data.object as any,
          processed: false,
        },
        update: {
          data: event.data.object as any,
        },
      });

      // Handle checkout.session.completed (credits + subscriptions)
      // This handler uses the transaction client for atomic DB updates
      if (event.type === 'checkout.session.completed') {
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          tx
        );
      }

      // Mark event as processed after successful handling
      // (entitlements events are handled separately below and marked by their own handler)
      if (event.type === 'checkout.session.completed') {
        await tx.stripeEvent.update({
          where: { eventId: event.id },
          data: { processed: true },
        });
      }
    });

    // Handle subscription-related events through entitlements system
    // These run outside the main transaction because the entitlements handler
    // creates its own Prisma connections. The idempotency check at the top
    // prevents duplicate processing.
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      await ensureEntitlementsInitialized();
      const repo = new PrismaEntitlementRepository(prisma);
      const result = await handleStripeWebhook(repo, body, signature);

      if (!result.success) {
        console.error(`[StripeWebhook] Entitlements handler failed for ${event.id}: ${result.error}`);
        // Don't throw — the event record was already created; if processing failed,
        // the event will remain unprocessed and can be retried manually.
      }
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
 * Uses the transaction client (tx) for atomic database operations.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  tx: any
) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const metadata = session.metadata || {};

  // Find user by stripe customer id
  const user = await tx.user.findFirst({
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
      await tx.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: credits },
        },
      });

      // Record transaction
      await tx.creditTransaction.create({
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
  await tx.user.update({
    where: { id: user.id },
    data: {
      plan: plan as any,
      stripeSubscriptionId: subscriptionId,
      credits: { increment: credits },
      creditsResetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  // Record transaction
  await tx.creditTransaction.create({
    data: {
      userId: user.id,
      amount: credits,
      type: 'PURCHASE',
    },
  });

  // Also update/create organization subscription
  try {
    const userOrg = await tx.userOrganization.findFirst({
      where: { userId: user.id },
    });

    if (userOrg) {
      await tx.subscription.upsert({
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
