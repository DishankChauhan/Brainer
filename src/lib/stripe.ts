import Stripe from 'stripe'
import { loadStripe, Stripe as StripeType } from '@stripe/stripe-js'

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
  typescript: true,
})

// Client-side Stripe instance
let stripePromise: Promise<StripeType | null>
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Stripe Price IDs (replace with your actual price IDs from Stripe Dashboard)
export const STRIPE_PRICES = {
  FREE: null, // Free plan doesn't need a price ID
  PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || 'price_1234567890', // Replace with actual price ID
  PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID || 'price_0987654321', // Replace with actual price ID
  TEAM_MONTHLY: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_1111111111', // Replace with actual price ID
  TEAM_YEARLY: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || 'price_2222222222', // Replace with actual price ID
}

export interface PricingPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  stripePriceId: string | null
  features: string[]
  popular?: boolean
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    stripePriceId: null,
    features: [
      '500 voice notes/month',
      '100 screenshots/month', 
      'Basic AI search',
      'Text extraction (OCR)',
      'Web app access',
    ],
  },
  {
    id: 'pro-monthly',
    name: 'Pro',
    price: 12,
    interval: 'month',
    stripePriceId: STRIPE_PRICES.PRO_MONTHLY,
    popular: true,
    features: [
      'Unlimited voice notes',
      'Unlimited screenshots',
      'Advanced AI search',
      'Smart text extraction',
      'Desktop + mobile apps',
      'Advanced AI insights',
      'Priority support',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro',
    price: 120, // $10/month when billed yearly
    interval: 'year',
    stripePriceId: STRIPE_PRICES.PRO_YEARLY,
    features: [
      'Unlimited voice notes',
      'Unlimited screenshots',
      'Advanced AI search',
      'Smart text extraction',
      'Desktop + mobile apps',
      'Advanced AI insights',
      'Priority support',
      '2 months free!',
    ],
  },
  {
    id: 'team-monthly',
    name: 'Team',
    price: 39,
    interval: 'month',
    stripePriceId: STRIPE_PRICES.TEAM_MONTHLY,
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'Advanced collaboration',
      'Custom AI training',
      'SSO & admin controls',
      'API access',
      'Dedicated support',
    ],
  },
]

export async function createCheckoutSession({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  priceId: string
  customerId?: string
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, string>
}) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    metadata,
  })

  return session
}

export async function createCustomer({
  email,
  name,
  metadata = {},
}: {
  email: string
  name?: string
  metadata?: Record<string, string>
}) {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  })

  return customer
}

export async function getCustomer(customerId: string) {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    return customer
  } catch (error) {
    console.error('Error retrieving customer:', error)
    return null
  }
}

export async function getSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error retrieving subscription:', error)
    return null
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId)
    return subscription
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '5 notes per month',
      'Basic note-taking',
      'Text search',
      'No AI features'
    ],
    limits: {
      maxNotes: 5,
      maxAISummaries: 0,
      maxVoiceTranscriptions: 0,
      maxScreenshots: 2,
      maxEmbeddings: 0
    }
  },
  PRO: {
    name: 'Pro',
    price: 9.99,
    priceId: process.env.STRIPE_PRICE_ID_PRO!,
    features: [
      'Unlimited notes',
      'AI summaries',
      'Voice transcription',
      'Screenshot OCR',
      'Memory recall (semantic search)',
      'All AI features'
    ],
    limits: {
      maxNotes: -1, // unlimited
      maxAISummaries: -1,
      maxVoiceTranscriptions: -1,
      maxScreenshots: -1,
      maxEmbeddings: -1
    }
  },
  PREMIUM: {
    name: 'Premium',
    price: 19.99,
    priceId: process.env.STRIPE_PRICE_ID_PREMIUM!,
    features: [
      'Everything in Pro',
      'Priority support',
      'Advanced AI features',
      'Custom integrations',
      'Team collaboration (coming soon)',
      'Advanced analytics'
    ],
    limits: {
      maxNotes: -1,
      maxAISummaries: -1,
      maxVoiceTranscriptions: -1,
      maxScreenshots: -1,
      maxEmbeddings: -1
    }
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS
export type PlanLimits = typeof SUBSCRIPTION_PLANS[SubscriptionPlan]['limits']

// Helper function to get plan by price ID
export function getPlanByPriceId(priceId: string): SubscriptionPlan | null {
  for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.priceId === priceId) {
      return key as SubscriptionPlan
    }
  }
  return null
}

// Helper function to check if feature is available for plan
export function isFeatureAvailable(plan: SubscriptionPlan, feature: string): boolean {
  const planConfig = SUBSCRIPTION_PLANS[plan]
  return (planConfig.features as readonly string[]).includes(feature)
}

// Helper function to check if limit is exceeded
export function isLimitExceeded(plan: SubscriptionPlan, usage: number, limitType: keyof PlanLimits): boolean {
  const limit = SUBSCRIPTION_PLANS[plan].limits[limitType]
  if (limit === -1) return false // unlimited
  return usage >= limit
} 