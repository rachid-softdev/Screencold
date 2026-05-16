import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const metadata = session.metadata || {};

        // Find user by stripe customer id
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user && metadata) {
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
            }
          } 
          // Handle subscription (plan upgrade)
          else {
            const plan = metadata.plan || 'STARTER';
            const credits = parseInt(metadata.credits || '50', 10);

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
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const amount = invoice.amount_paid / 100;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          const planCredits: Record<string, number> = {
            STARTER: 50,
            PRO: 500,
            AGENCY: -1,
          };
          const creditsToAdd = planCredits[user.plan] || 50;
          if (creditsToAdd > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                credits: { increment: creditsToAdd },
                creditsResetsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
            });

            await prisma.creditTransaction.create({
              data: {
                userId: user.id,
                amount: creditsToAdd,
                type: 'MONTHLY_REFILL',
              },
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          const status = subscription.status;
          if (status === 'active' || status === 'trialing') {
            // Plan stays the same, update subscription ID
            await prisma.user.update({
              where: { id: user.id },
              data: { stripeSubscriptionId: subscription.id },
            });
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        });

        if (user) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan: 'FREE',
              stripeSubscriptionId: null,
              credits: 5,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}