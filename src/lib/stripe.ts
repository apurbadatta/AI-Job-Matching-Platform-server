import Stripe from "stripe";

export const stripe: Stripe | null = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  : null;

// Price IDs - these will be created once in Stripe Dashboard or via script
// For TEST MODE, create these in https://dashboard.stripe.com/test/dashboard
export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID || "price_pro_monthly_placeholder",
  business_monthly: process.env.STRIPE_BUSINESS_PRICE_ID || "price_business_monthly_placeholder",
};

export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    jobPostLimit: 3,
    features: [
      "3 job posts",
      "Basic listing",
      "Standard support",
    ],
  },
  pro: {
    name: "Pro",
    price: 9.99,
    jobPostLimit: -1, // unlimited
    features: [
      "Unlimited job posts",
      "AI job description generator",
      "Featured badge",
      "Priority in search results",
    ],
  },
  business: {
    name: "Business",
    price: 29.99,
    jobPostLimit: -1,
    features: [
      "Everything in Pro",
      "Analytics dashboard",
      "Priority support",
      "Multiple recruiter seats",
      "Advanced branding",
    ],
  },
} as const;

export type PlanType = keyof typeof PLAN_DETAILS;
