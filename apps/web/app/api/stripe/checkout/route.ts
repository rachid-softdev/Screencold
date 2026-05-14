import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

const PLAN_PRICES: Record<string, { priceId: string; credits: number }> = {
  STARTER: { priceId: process.env.STRIPE_STARTER_PRICE_ID!, credits: 50 },
  PRO: { priceId: process.env.STRIPE_PRO_PRICE_ID!, credits: 500 },
  AGENCY: { priceId: process.env.STRIPE_AGENCY_PRICE_ID!, credits: -1 },
};

export async function POST(req: NextRequest) {
  const { plan } = await req.json();

  if (!plan || !PLAN_PRICES[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const priceId = PLAN_PRICES[plan].priceId;
  const credits = PLAN_PRICES[plan].credits;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      metadata: { plan, credits: credits.toString() },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}