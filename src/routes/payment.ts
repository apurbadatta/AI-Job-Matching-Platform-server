import express, { Router, Request, Response } from "express";
import { isAuthenticated, AuthRequest, hasRole } from "../middleware/auth";
import { stripe, PRICE_IDS, PLAN_DETAILS, PlanType } from "../lib/stripe";
import mongoose from "mongoose";
import Stripe from "stripe";

const router = Router();

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

// Get subscription status (employer only)
router.get("/subscription-status", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const user = await db.collection("user").findOne({ _id: toObjectId(req.user!.id) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = (user as any).subscription || {};
    const plan = subscription.plan || "free";
    const status = subscription.status || "inactive";
    const stripeSubscriptionId = subscription.stripeSubscriptionId || null;
    const stripeCustomerId = subscription.stripeCustomerId || null;
    const currentPeriodEnd = subscription.currentPeriodEnd || null;

    res.json({
      plan,
      status,
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodEnd,
      features: PLAN_DETAILS[plan as PlanType]?.features || PLAN_DETAILS.free.features,
      jobPostLimit: PLAN_DETAILS[plan as PlanType]?.jobPostLimit || 3,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});

// Create checkout session (employer only)
router.post("/create-checkout-session", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables." });
    }

    const { plan } = req.body;

    if (!plan || !["pro", "business"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Must be 'pro' or 'business'" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const user = await db.collection("user").findOne({ _id: toObjectId(req.user!.id) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = (user as any).subscription || {};

    // If user already has a Stripe customer ID, use it
    let customerId = subscription.stripeCustomerId;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: (user as any).email,
        name: (user as any).name,
        metadata: {
          userId: req.user!.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to user
      await db.collection("user").updateOne(
        { _id: toObjectId(req.user!.id) },
        { $set: { "subscription.stripeCustomerId": customerId } }
      );
    }

    const priceId = plan === "pro" ? PRICE_IDS.pro_monthly : PRICE_IDS.business_monthly;
    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${clientUrl}/pricing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${clientUrl}/pricing?canceled=true`,
      metadata: {
        userId: req.user!.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: req.user!.id,
          plan,
        },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Stripe webhook
router.post("/webhook", express.raw({ type: "application/json" }), async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: "Stripe is not configured" });
  }

  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not defined");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const db = mongoose.connection.db;
  if (!db) {
    return res.status(500).json({ error: "Database not connected" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan as PlanType;

        if (userId && plan) {
          // Get the subscription from Stripe
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);

          const subData = subscription as any;
          const periodEndTimestamp = subData.current_period_end;
          const periodEnd = typeof periodEndTimestamp === "number"
            ? new Date(periodEndTimestamp * 1000)
            : new Date();

          await db.collection("user").updateOne(
            { _id: toObjectId(userId) },
            {
              $set: {
                "subscription.plan": plan,
                "subscription.status": "active",
                "subscription.stripeSubscriptionId": subscriptionId,
                "subscription.stripeCustomerId": session.customer as string,
                "subscription.currentPeriodEnd": periodEnd,
                "subscription.updatedAt": new Date(),
              },
            }
          );
          console.log(`User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const status = subscription.status === "active" ? "active" :
                         subscription.status === "past_due" ? "past_due" :
                         subscription.status === "trialing" ? "trialing" : "inactive";

          const subData = subscription as any;
          const periodEndTimestamp = subData.current_period_end;
          const periodEnd = typeof periodEndTimestamp === "number"
            ? new Date(periodEndTimestamp * 1000)
            : new Date();

          await db.collection("user").updateOne(
            { _id: toObjectId(userId) },
            {
              $set: {
                "subscription.status": status,
                "subscription.currentPeriodEnd": periodEnd,
                "subscription.updatedAt": new Date(),
              },
            }
          );
          console.log(`Subscription updated for user ${userId}: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await db.collection("user").updateOne(
            { _id: toObjectId(userId) },
            {
              $set: {
                "subscription.plan": "free",
                "subscription.status": "inactive",
                "subscription.stripeSubscriptionId": null,
                "subscription.currentPeriodEnd": null,
                "subscription.updatedAt": new Date(),
              },
            }
          );
          console.log(`Subscription canceled for user ${userId}, reverted to free plan`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

// Cancel subscription (employer only)
router.post("/cancel-subscription", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const user = await db.collection("user").findOne({ _id: toObjectId(req.user!.id) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = (user as any).subscription || {};
    const stripeSubscriptionId = subscription.stripeSubscriptionId;

    if (!stripeSubscriptionId) {
      return res.status(400).json({ error: "No active subscription to cancel" });
    }

    // Cancel at period end (not immediately)
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await db.collection("user").updateOne(
      { _id: toObjectId(req.user!.id) },
      {
        $set: {
          "subscription.cancelAtPeriodEnd": true,
          "subscription.updatedAt": new Date(),
        },
      }
    );

    res.json({
      message: "Subscription will be canceled at the end of the billing period",
      currentPeriodEnd: subscription.currentPeriodEnd,
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Get invoices (employer only)
router.get("/invoices", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.json({ invoices: [] });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const user = await db.collection("user").findOne({ _id: toObjectId(req.user!.id) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = (user as any).subscription || {};
    const customerId = subscription.stripeCustomerId;

    if (!customerId) {
      return res.json({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 20,
    });

    const formatted = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      status: inv.status,
      amount: inv.amount_paid,
      currency: inv.currency,
      date: inv.created,
      invoiceUrl: inv.hosted_invoice_url,
      pdfUrl: inv.invoice_pdf,
      description: inv.description || "Subscription payment",
    }));

    res.json({ invoices: formatted });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.json({ invoices: [] });
  }
});

// Create billing portal session (employer only)
router.post("/create-portal-session", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const db = mongoose.connection.db;
    if (!db) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const user = await db.collection("user").findOne({ _id: toObjectId(req.user!.id) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const subscription = (user as any).subscription || {};
    const customerId = subscription.stripeCustomerId;

    if (!customerId) {
      return res.status(400).json({ error: "No Stripe customer found" });
    }

    const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${clientUrl}/jobs/manage/payment`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
