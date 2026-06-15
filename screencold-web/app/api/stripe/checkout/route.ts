import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripePriceId } from '@/lib/plans';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil' as any,
});

const PLAN_CREDITS: Record<string, { credits: number }> = {
  STARTER: { credits: 50 },
  PRO: { credits: 500 },
  AGENCY: { credits: -1 },
};

export async function POST(req: NextRequest) {
  const { plan, annual } = await req.json();

  if (!plan || !PLAN_CREDITS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const credits = PLAN_CREDITS[plan].credits;
  const isAnnual = annual === true;

  // Get the appropriate price ID based on billing interval
  const priceId = getStripePriceId(plan as any, isAnnual ? 'yearly' : 'monthly');

  if (!priceId) {
    return NextResponse.json({ error: 'Price ID not configured for this plan' }, { status: 500 });
  }

  try {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?cancelled=true`,
      metadata: {
        plan,
        credits: credits.toString(),
        billing: isAnnual ? 'annual' : 'monthly',
      },
    };

    // Get user from auth to associate customer
    // Note: For existing users, we could also pass customer: user.stripeCustomerId

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}