/**
 * Stripe Credits Checkout
 * Purchase additional credits via one-time payment
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { apiMiddleware } from '@/middleware';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// Credit packages mapping
const CREDIT_PRICES: Record<number, { priceId: string; name: string }> = {
  10: { priceId: process.env.STRIPE_CREDITS_10_PRICE_ID!, name: '10 Credits Pack' },
  25: { priceId: process.env.STRIPE_CREDITS_25_PRICE_ID!, name: '25 Credits Pack' },
  50: { priceId: process.env.STRIPE_CREDITS_50_PRICE_ID!, name: '50 Credits Pack' },
  100: { priceId: process.env.STRIPE_CREDITS_100_PRICE_ID!, name: '100 Credits Pack' },
};

export async function POST(request: NextRequest) {
  try {
    const { authorized, userId, errorResponse } = await apiMiddleware(request, {
      requireAuth: true,
      requireCredits: false,
    });

    if (!authorized || !userId) {
      return errorResponse!;
    }

    const { credits } = await request.json();

    // Validate inputs
    if (!credits || !CREDIT_PRICES[credits]) {
      return NextResponse.json(
        { error: 'INVALID_PACKAGE', message: 'Invalid credit package' },
        { status: 400 }
      );
    }

    const packageInfo = CREDIT_PRICES[credits];

    // Get or create Stripe customer
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true, name: true },
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user?.email,
        name: user?.name || undefined,
        metadata: { userId },
      });
      customerId = customer.id;

      // Update user with customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: packageInfo.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=credits_purchased`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?cancelled=true`,
      customer: customerId,
      metadata: {
        userId,
        credits: credits.toString(),
        type: 'CREDITS_PURCHASE',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Credits Checkout] Error:', err);
    return NextResponse.json(
      { error: 'CHECKOUT_FAILED', message: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}