import Stripe from "stripe";

// Initialize Stripe with API version and configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-04-10",
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 30000,
});

export default stripe;

// Plan to Price ID mapping
export const PLAN_PRICES: Record<string, string | undefined> = {
  FREE: undefined, // No Stripe price for free plan
  STARTER: process.env.STRIPE_PRICE_ID_STARTER,
  PRO: process.env.STRIPE_PRICE_ID_PRO,
  AGENCY: process.env.STRIPE_PRICE_ID_AGENCY,
};

// Helper to get price ID for a plan
export function getPriceIdForPlan(plan: string): string | null {
  const priceId = PLAN_PRICES[plan];
  return priceId ?? null;
}

// Create or get Stripe customer
export async function createOrGetCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  // Check if customer already exists
  const user = await import("@screencold/db").then((m) => m.prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  }));

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: {
      userId,
    },
  });

  // Save customer ID to user
  await import("@screencold/db").then((m) => m.prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  }));

  return customer.id;
}

// Create checkout session for subscription
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        priceId,
      },
    },
  });
}

// Create customer portal session
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Cancel subscription
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId);
}

// Get subscription details
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId);
}

// Update subscription quantity
export async function updateSubscriptionQuantity(
  subscriptionId: string,
  priceId: string,
  quantity: number
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: undefined as unknown as string, // Will be auto-determined
        price: priceId,
        quantity,
      },
    ],
    expand: ["items.data.price.product"],
  });
}

// Get invoice for customer
export async function getInvoices(
  customerId: string,
  limit = 10
): Promise<Stripe.Invoice[]> {
  const result = await stripe.invoices.list({
    customer: customerId,
    limit,
  });
  return result.data;
}

// Create refund
export async function createRefund(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.Refund> {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
  });
}

// Webhook event types we handle
export type WebhookEventType =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed";

// Helper to format amount for display (cents to euros)
export function formatAmount(amount: number): number {
  return amount / 100;
}

// Helper to format amount for Stripe (euros to cents)
export function parseAmount(amount: number): number {
  return Math.round(amount * 100);
}