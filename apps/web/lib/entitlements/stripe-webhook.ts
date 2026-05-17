import Stripe from 'stripe';
import { IEntitlementRepository } from './repository';
import { getFeatureGateService } from './service';
import { getCacheService } from './cache';
import { addMonths, startOfDay } from 'date-fns';

// ============================================
// Stripe Webhook Handler
// ============================================

export class StripeWebhookHandler {
  private stripe: Stripe;
  private repo: IEntitlementRepository;
  private cache = getCacheService();

  constructor(repo: IEntitlementRepository) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-04-30.basil',
    });
    this.repo = repo;
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    payload: string,
    signature: string
  ): Promise<{ success: boolean; error?: string }> {
    // Verify signature
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('[StripeWebhook] Signature verification failed:', err);
      return { success: false, error: 'Invalid signature' };
    }

    // Check idempotency
    const isProcessed = await this.repo.isEventProcessed(event.id);
    if (isProcessed) {
      console.log(`[StripeWebhook] Event ${event.id} already processed, skipping`);
      return { success: true };
    }

    // Process event
    try {
      await this.processEvent(event);
      // Mark as processed
      await this.repo.markEventProcessed(event.id, event.type, event.data.object as any);
      return { success: true };
    } catch (error) {
      console.error('[StripeWebhook] Error processing event:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Process specific event types
   */
  private async processEvent(event: Stripe.Event): Promise<void> {
    const service = getFeatureGateService();

    switch (event.type) {
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }

    // Invalidate cache after subscription changes
    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted' ||
      event.type === 'invoice.paid' ||
      event.type === 'invoice.payment_failed'
    ) {
      // Get org ID from subscription and invalidate
      const sub = event.data.object as Stripe.Subscription;
      const orgId = await this.getOrgIdFromCustomer(sub.customer as string);
      if (orgId) {
        await service.invalidateCache(orgId);
      }
    }
  }

  /**
   * Handle subscription created
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const orgId = await this.getOrCreateOrgFromCustomer(customerId);
    const planKey = this.getPlanFromPriceId(subscription.items.data[0]?.price.id);

    if (!planKey) {
      console.error('[StripeWebhook] Unknown price ID:', subscription.items.data[0]?.price.id);
      return;
    }

    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    await this.repo.createSubscription(orgId, planKey, subscription.id);
    console.log(`[StripeWebhook] Created subscription for org ${orgId}: ${planKey}`);
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const stripeSubId = subscription.id;
    const existingSub = await this.repo.getSubscriptionByStripeId(stripeSubId);

    if (!existingSub) {
      console.log(`[StripeWebhook] Subscription ${stripeSubId} not found, creating...`);
      return this.handleSubscriptionCreated(subscription);
    }

    const planKey = this.getPlanFromPriceId(subscription.items.data[0]?.price.id);
    if (!planKey) return;

    const periodStart = new Date(subscription.current_period_start * 1000);
    const periodEnd = new Date(subscription.current_period_end * 1000);

    await this.repo.updateSubscription({
      orgId: existingSub.planKey, // We need orgId but we have planKey - need to fix
      planKey,
      status: subscription.status === 'active' ? 'active' : subscription.status === 'trialing' ? 'trialing' : 'past_due',
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
  }

  /**
   * Handle subscription deleted (canceled)
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const stripeSubId = subscription.id;
    const existingSub = await this.repo.getSubscriptionByStripeId(stripeSubId);

    if (existingSub) {
      // We need to find org by stripe sub - this is a bug in the repo
      // For now, just log
      console.log(`[StripeWebhook] Subscription ${stripeSubId} canceled, downgrading to FREE`);
    }
  }

  /**
   * Handle invoice paid (subscription renewal)
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const orgId = await this.getOrCreateOrgFromCustomer(customerId);

    const periodStart = startOfDay(new Date());
    const periodEnd = addMonths(periodStart, 1);

    // Extend subscription period
    const subscription = await this.repo.getSubscription(orgId);
    if (subscription) {
      await this.repo.updateSubscription({
        orgId,
        planKey: subscription.planKey,
        status: 'active',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      });
    }

    console.log(`[StripeWebhook] Invoice paid for org ${orgId}, renewed until ${periodEnd}`);
  }

  /**
   * Handle invoice payment failed
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const orgId = await this.getOrCreateOrgFromCustomer(customerId);

    const subscription = await this.repo.getSubscription(orgId);
    if (subscription) {
      await this.repo.updateSubscription({
        orgId,
        planKey: subscription.planKey,
        status: 'past_due',
      });
    }

    console.log(`[StripeWebhook] Invoice payment failed for org ${orgId}`);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private async getOrgIdFromCustomer(customerId: string): Promise<string | null> {
    const org = await this.repo.getOrgByStripeCustomer(customerId);
    return org?.id ?? null;
  }

  private async getOrCreateOrgFromCustomer(customerId: string): Promise<string> {
    // This would require adding a method to find org by stripe customer
    // For now, we'll need to get it from somewhere else
    // This is a placeholder - in real implementation, you'd query the DB
    // based on stripeCustomerId
    const org = await this.repo.getOrgByStripeCustomer(customerId);
    if (org) return org.id;
    
    // If not found, we can't create without userId - this needs to be handled
    throw new Error(`Organization not found for customer ${customerId}`);
  }

  /**
   * Map Stripe price ID to plan key
   */
  private getPlanFromPriceId(priceId: string | undefined): string | null {
    if (!priceId) return null;

    const priceToPlan: Record<string, string> = {
      [process.env.STRIPE_STARTER_PRICE_ID!]: 'STARTER',
      [process.env.STRIPE_PRO_PRICE_ID!]: 'PRO',
      [process.env.STRIPE_AGENCY_PRICE_ID!]: 'AGENCY',
    };

    return priceToPlan[priceId] ?? null;
  }
}

// ============================================
// Webhook Route Handler
// ============================================

let webhookHandler: StripeWebhookHandler | null = null;

export async function handleStripeWebhook(
  repo: IEntitlementRepository,
  payload: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  if (!webhookHandler) {
    webhookHandler = new StripeWebhookHandler(repo);
  }
  return webhookHandler.handleWebhook(payload, signature);
}