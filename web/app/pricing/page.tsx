"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/hooks/use-prefers-reduced-motion";
import Image from "next/image";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Essential access to daily AI newsletters.",
    features: [
      "Daily AI newsletter",
      "5 articles per issue",
      "Basic topic tags",
      "Community access",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "Full access with advanced features for power readers.",
    features: [
      "Everything in Free",
      "Unlimited articles per issue",
      "Advanced filtering & search",
      "Priority delivery",
      "Archive access",
      "Export to PDF",
    ],
    cta: "Start Pro Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Team plans with admin controls and analytics.",
    features: [
      "Everything in Pro",
      "Team management (up to 25)",
      "Custom branding",
      "API access",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const prefersReducedMotion = usePrefersReducedMotion();

  const yearlyDiscount = billing === "yearly" ? 0.8 : 1;

  return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <Image
          src="/images/gradient horizontal logo.png"
          alt="The Gradient Logo"
          width={120}
          height={120}
          className="mx-auto rounded-xl mb-6"
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-gray-400">
          Pricing
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-gray-100 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-gray-400">
          Choose the plan that works for you. No hidden fees.
        </p>
      </motion.div>

      <div className="mt-10 flex justify-center gap-2">
        <button
          onClick={() => setBilling("monthly")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
            billing === "monthly"
              ? "bg-accent-blue/20 text-accent-blue"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("yearly")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
            billing === "yearly"
              ? "bg-accent-blue/20 text-accent-blue"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Yearly
          <span className="ml-1.5 rounded-full bg-accent-cyan/20 px-2 py-0.5 text-xs text-accent-cyan">
            Save 20%
          </span>
        </button>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3 lg:max-w-5xl lg:mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className={`relative rounded-2xl border p-8 transition-all duration-500 ${
              plan.highlighted
                ? "border-accent-blue/30 bg-gradient-to-b from-accent-blue/5 to-bg-card shadow-[0_0_60px_-15px_rgba(79,124,255,0.2)]"
                : "border-white/[0.06] bg-bg-card/60 backdrop-blur-sm hover:border-white/[0.12]"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan px-4 py-1 text-xs font-semibold text-white">
                Most Popular
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-200">{plan.name}</h3>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-gray-400">{plan.period}</span>
            </div>
            {billing === "yearly" && plan.price !== "Custom" && (
              <p className="mt-1 text-xs text-gray-500">
                {plan.price === "$0" ? "" : `$${(parseFloat(plan.price.replace("$", "")) * 12 * yearlyDiscount).toFixed(0)}/year`}
              </p>
            )}
            <p className="mt-3 text-sm text-gray-400">{plan.description}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                  <svg className="h-5 w-5 text-accent-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`mt-8 w-full rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 ${
                plan.highlighted
                  ? "bg-gradient-to-r from-accent-blue to-accent-cyan text-white shadow-lg shadow-accent-blue/25"
                  : "border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              {plan.cta}
            </motion.button>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-gray-100">Frequently Asked Questions</h2>
        <div className="mt-8 max-w-2xl mx-auto space-y-4">
          {[
            { q: "Can I cancel anytime?", a: "Yes, you can cancel your subscription at any time. No cancellation fees." },
            { q: "Is there a free trial?", a: "The Pro plan includes a 14-day free trial. No credit card required." },
            { q: "Can I switch plans?", a: "Yes, you can upgrade or downgrade your plan at any time." },
            { q: "What payment methods do you accept?", a: "We accept all major credit cards and PayPal." },
          ].map((faq) => (
            <div key={faq.q} className="rounded-xl border border-white/[0.06] bg-bg-card/40 p-6">
              <h4 className="font-semibold text-gray-200">{faq.q}</h4>
              <p className="mt-2 text-sm text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}