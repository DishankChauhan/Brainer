import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SubscriptionStatus, SubscriptionPlan } from '@prisma/client';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export async function POST(req: NextRequest) {
  try {
    const { sessionId, userEmail, firebaseUid } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 });
    }

    if (!firebaseUid) {
      return NextResponse.json({ error: 'Firebase UID is required' }, { status: 400 });
    }

    // Retrieve the checkout session to get subscription details
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (checkoutSession.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Get subscription details
    const subscription = typeof checkoutSession.subscription === 'object' 
      ? checkoutSession.subscription as Stripe.Subscription
      : await stripe.subscriptions.retrieve(checkoutSession.subscription as string);

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Get customer details
    const customer = typeof checkoutSession.customer === 'object' && checkoutSession.customer
      ? checkoutSession.customer as Stripe.Customer
      : checkoutSession.customer ? await stripe.customers.retrieve(checkoutSession.customer as string) as Stripe.Customer
      : null;

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get user from database using Firebase UID
    const user = await prisma.user.findUnique({
      where: { id: firebaseUid }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Determine subscription plan based on price ID
    const priceId = subscription.items.data[0]?.price.id;
    let subscriptionPlan: SubscriptionPlan = SubscriptionPlan.FREE;
    
    if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID) {
      subscriptionPlan = SubscriptionPlan.PRO;
    } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID) {
      subscriptionPlan = SubscriptionPlan.TEAM;
    }

    // Map Stripe subscription status to our enum
    let subscriptionStatus: SubscriptionStatus = SubscriptionStatus.FREE;
    switch (subscription.status) {
      case 'active':
        subscriptionStatus = SubscriptionStatus.ACTIVE;
        break;
      case 'past_due':
        subscriptionStatus = SubscriptionStatus.PAST_DUE;
        break;
      case 'canceled':
        subscriptionStatus = SubscriptionStatus.CANCELED;
        break;
      case 'incomplete':
        subscriptionStatus = SubscriptionStatus.INCOMPLETE;
        break;
      case 'incomplete_expired':
        subscriptionStatus = SubscriptionStatus.INCOMPLETE_EXPIRED;
        break;
      case 'trialing':
        subscriptionStatus = SubscriptionStatus.TRIALING;
        break;
      case 'unpaid':
        subscriptionStatus = SubscriptionStatus.UNPAID;
        break;
      default:
        subscriptionStatus = SubscriptionStatus.FREE;
    }

    // Update user subscription in database
    await prisma.user.update({
      where: { id: firebaseUid },
      data: {
        stripeCustomerId: customer.id,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        subscriptionStatus,
        subscriptionPlan,
        subscriptionCurrentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        subscriptionCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      },
    });

    // Update the customer in Stripe with user metadata
    if (!customer.metadata?.firebaseUid) {
      await stripe.customers.update(customer.id, {
        metadata: {
          firebaseUid: firebaseUid,
          userEmail: user.email,
          linkedAt: new Date().toISOString(),
        },
      });
    }

    console.log('Subscription successfully linked:', {
      firebaseUid: firebaseUid,
      userEmail: user.email,
      customerId: customer.id,
      subscriptionId: subscription.id,
      subscriptionPlan,
      subscriptionStatus,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscriptionPlan,
        status: subscriptionStatus,
        customerId: customer.id,
        currentPeriodEnd: (subscription as any).current_period_end,
      },
    });
  } catch (error) {
    console.error('Error linking subscription:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to link subscription' },
      { status: 500 }
    );
  }
} 