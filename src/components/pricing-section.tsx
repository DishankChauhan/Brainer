"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StarBorder } from "@/components/ui/star-border";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import Link from "next/link";
import { useState, useRef } from "react";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
  onClick?: () => void;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
  };

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
          cancelUrl: `${window.location.origin}/?canceled=true`,
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

  const pricingPlans: PricingPlan[] = [
    {
      name: "Free",
      price: "0",
      yearlyPrice: "0",
      period: "Forever",
      features: [
        "500 voice notes/month",
        "100 screenshots/month", 
        "Basic AI search",
        "Text extraction (OCR)",
        "Web app access"
      ],
      description: "Perfect for getting started",
      buttonText: "Get Started Free",
      href: "/auth/signup",
      isPopular: false,
    },
    {
      name: "Pro",
      price: "12",
      yearlyPrice: "10",
      period: "month",
      features: [
        "Unlimited voice notes",
        "Unlimited screenshots",
        "Advanced AI search", 
        "Smart text extraction",
        "Desktop + mobile apps",
        "Advanced AI insights",
        "Priority support"
      ],
      description: "Most popular choice for professionals",
      buttonText: loading === 'pro' ? 'Loading...' : 'Start Pro Trial',
      href: "#",
      isPopular: true,
      onClick: () => handleStripeCheckout('pro')
    },
    {
      name: "Team",
      price: "19.99",
      yearlyPrice: "15.99",
      period: "month",
      features: [
        "Everything in Pro",
        "Unlimited team members",
        "Advanced collaboration",
        "Custom AI training",
        "SSO & admin controls",
        "API access",
        "Dedicated support"
      ],
      description: "For teams and organizations",
      buttonText: loading === 'team' ? 'Loading...' : 'Start Team Trial',
      href: "#",
      isPopular: false,
      onClick: () => handleStripeCheckout('team')
    }
  ];

  return (
    <div className="container mx-auto px-6 py-20">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-white">
          {title}
        </h2>
        <p className="text-gray-400 text-lg whitespace-pre-line">
          {description}
        </p>
      </div>

      <div className="flex justify-center items-center mb-16 gap-4">
        <span className="text-white font-semibold">Monthly</span>
        <Switch
          ref={switchRef as any}
          checked={!isMonthly}
          onCheckedChange={handleToggle}
          className="relative"
        />
        <span className="text-white font-semibold">
          Annual <span className="text-green-400">(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {pricingPlans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 1 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl border-[1px] p-6 bg-gray-900/50 text-center lg:flex lg:flex-col lg:justify-center relative`,
              plan.isPopular ? "border-white border-2" : "border-gray-700/50",
              "flex flex-col min-h-[600px]",
              !plan.isPopular && "mt-5",
              index === 0 || index === 2
                ? "z-0 transform translate-x-0 translate-y-0"
                : "z-10",
              plan.isPopular && "transform scale-105"
            )}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-white to-gray-200 text-black px-4 py-2 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <p className="text-base font-semibold text-white mb-6">
                  {plan.name}
                </p>
                <div className="flex items-center justify-center gap-x-2 mb-4">
                  <span className="text-5xl font-bold tracking-tight text-white">
                    ${isMonthly ? plan.price : plan.yearlyPrice}
                  </span>
                  {plan.period !== "Forever" && (
                    <span className="text-sm font-semibold leading-6 tracking-wide text-gray-400">
                      / {plan.period}
                    </span>
                  )}
                </div>

                <p className="text-xs leading-5 text-gray-400 mb-8">
                  {plan.period === "Forever" ? "Forever free" : isMonthly ? "billed monthly" : "billed annually"}
                </p>

                <ul className="gap-4 flex flex-col mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-left text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <hr className="w-full mb-6 border-gray-700" />

                {plan.onClick ? (
                  <StarBorder
                    onClick={plan.onClick}
                    disabled={loading === plan.name.toLowerCase()}
                    color={plan.isPopular ? "#ffffff" : "#9ca3af"}
                    speed="4s"
                    className={cn(
                      "mb-4",
                      loading === plan.name.toLowerCase() && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      plan.isPopular
                        ? "bg-white text-black"
                        : "bg-gray-700 text-white"
                    )}>
                      {plan.buttonText}
                    </div>
                  </StarBorder>
                ) : (
                  <StarBorder
                    as={Link}
                    href={plan.href}
                    color={plan.isPopular ? "#ffffff" : "#9ca3af"}
                    speed="4s"
                    className="mb-4"
                  >
                    <div className={cn(
                      plan.isPopular
                        ? "bg-white text-black"
                        : "bg-gray-700 text-white"
                    )}>
                      {plan.buttonText}
                    </div>
                  </StarBorder>
                )}
                <p className="text-xs leading-5 text-gray-400">
                  {plan.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 