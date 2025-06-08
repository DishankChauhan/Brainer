'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleStripeCheckout = async (plan: 'pro' | 'team') => {
    setLoading(plan);
    
    try {
      // Use environment variables for Stripe price IDs
      const priceId = plan === 'pro' 
        ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID;

      if (!priceId) {
        console.error('Stripe price ID not configured');
        alert('Payment configuration error. Please contact support.');
        return;
      }

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/auth/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing?canceled=true`,
          // No userEmail - Stripe will collect it during checkout
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error('Stripe checkout error:', error);
        alert('Failed to create checkout session. Please try again.');
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#111111]">
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Start free and upgrade as you grow. All plans include our core features with different usage limits.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 relative">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <div className="text-4xl font-bold text-white mb-2">$0</div>
              <p className="text-gray-400">Forever free</p>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                500 voice notes/month
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                100 screenshots/month
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Basic AI search
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Text extraction (OCR)
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Web app access
              </li>
            </ul>
            
            <Link href="/auth/signup">
              <button className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-200">
                Get Started Free
              </button>
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gray-900/50 p-8 rounded-lg border border-indigo-500/50 relative transform scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <div className="text-4xl font-bold text-white mb-2">$12</div>
              <p className="text-gray-400">per month</p>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Unlimited voice notes
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Unlimited screenshots
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Advanced AI search
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Smart text extraction
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Desktop + mobile apps
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Advanced AI insights
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Priority support
              </li>
            </ul>
            
            <button 
              onClick={() => handleStripeCheckout('pro')}
              disabled={loading === 'pro'}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {loading === 'pro' ? 'Loading...' : 'Start Pro Trial'}
            </button>
          </div>

          {/* Team Plan */}
          <div className="bg-gray-900/50 p-8 rounded-lg border border-gray-700/50 relative">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Team</h3>
              <div className="text-4xl font-bold text-white mb-2">$39</div>
              <p className="text-gray-400">per month</p>
            </div>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Everything in Pro
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Unlimited team members
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Advanced collaboration
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Custom AI training
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                SSO & admin controls
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                API access
              </li>
              <li className="flex items-center text-gray-300">
                <Check className="w-5 h-5 text-green-400 mr-3" />
                Dedicated support
              </li>
            </ul>
            
            <button 
              onClick={() => handleStripeCheckout('team')}
              disabled={loading === 'team'}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {loading === 'team' ? 'Loading...' : 'Start Team Trial'}
            </button>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-gray-400 mb-4">
            All plans include 14-day free trial • No credit card required • Cancel anytime
          </p>
          <p className="text-sm text-gray-500">
            Need a custom plan? <a href="#" className="text-indigo-400 hover:text-indigo-300">Contact us</a> for enterprise solutions.
          </p>
        </div>
      </div>
    </div>
  );
} 