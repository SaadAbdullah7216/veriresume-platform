import express from "express";
import Stripe from "stripe";
import User from "../models/User.js";
import Subscription from "../models/Subscription.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================
// POST /api/subscription/create-checkout
// Creates a Stripe Checkout Session for subscription
// ============================================
router.post("/create-checkout", authMiddleware, async (req, res) => {
  try {
    const { plan } = req.body; // "monthly" or "yearly"
    const user = req.user;

    if (!["monthly", "yearly"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Must be 'monthly' or 'yearly'." });
    }

    const priceId =
      plan === "monthly"
        ? process.env.STRIPE_MONTHLY_PRICE_ID
        : process.env.STRIPE_YEARLY_PRICE_ID;

    // Look up or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      stripeCustomerId = customer.id;
      await User.findByIdAndUpdate(user._id, { stripeCustomerId });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: user._id.toString(),
        plan,
      },
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    res.status(500).json({ error: "Failed to create checkout session." });
  }
});

// ============================================
// POST /api/subscription/verify-session
// Verifies Stripe Checkout session directly via API
// and activates premium — no webhook needed
// ============================================
router.post("/verify-session", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required." });
    }

    // Already premium? Skip.
    const user = await User.findById(req.user._id);
    if (user.isPremium) {
      return res.json({ isPremium: true, message: "Already premium." });
    }

    // Retrieve checkout session from Stripe with expanded subscription
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // Verify session belongs to current user
    if (session.metadata.userId !== req.user._id.toString()) {
      return res.status(403).json({ error: "Session does not belong to this user." });
    }

    // Check payment completed
    if (session.payment_status !== "paid") {
      return res.json({ isPremium: false, message: "Payment not completed yet." });
    }

    const stripeSub = session.subscription;
    if (!stripeSub || typeof stripeSub === "string") {
      return res.json({ isPremium: false, message: "Subscription not found." });
    }

    // Only create subscription record if webhook hasn't already done it
    const existingSub = await Subscription.findOne({
      stripeSubscriptionId: stripeSub.id,
    });

    if (!existingSub) {
      const priceId = stripeSub.items.data[0].price.id;
      const interval = stripeSub.items.data[0].price.recurring.interval === "month" ? "monthly" : "yearly";
      const amount = interval === "monthly" ? 19.99 : 199.99;

      await Subscription.create({
        user: req.user._id,
        plan: "Premium",
        amount,
        paymentStatus: "Paid",
        validFrom: new Date(stripeSub.current_period_start * 1000),
        validUntil: new Date(stripeSub.current_period_end * 1000),
        stripeCustomerId: session.customer,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        stripeSessionId: session.id,
        interval,
        status: "active",
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      });
    }

    // Activate premium
    await User.findByIdAndUpdate(req.user._id, {
      isPremium: true,
      premiumExpiresAt: new Date(stripeSub.current_period_end * 1000),
      stripeCustomerId: session.customer,
    });

    console.log(`✅ Premium activated via session verification for user ${req.user._id}`);
    res.json({ isPremium: true, message: "Premium activated!" });
  } catch (err) {
    console.error("Error verifying session:", err);
    res.status(500).json({ error: "Failed to verify session." });
  }
});

// ============================================
// GET /api/subscription/status
// Returns current subscription status for the user
// ============================================
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: "active",
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return res.json({
        isPremium: false,
        plan: null,
        interval: null,
        validUntil: null,
        cancelAtPeriodEnd: false,
      });
    }

    res.json({
      isPremium: true,
      plan: subscription.plan,
      interval: subscription.interval,
      validUntil: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });
  } catch (err) {
    console.error("Error fetching subscription status:", err);
    res.status(500).json({ error: "Failed to fetch subscription status." });
  }
});

// ============================================
// POST /api/subscription/cancel
// Cancels subscription at end of billing period
// ============================================
router.post("/cancel", authMiddleware, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user: req.user._id,
      status: "active",
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.status(404).json({ error: "No active subscription found." });
    }

    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    subscription.cancelAtPeriodEnd = true;
    await subscription.save();

    res.json({ message: "Subscription will be canceled at the end of the billing period." });
  } catch (err) {
    console.error("Error canceling subscription:", err);
    res.status(500).json({ error: "Failed to cancel subscription." });
  }
});

// ============================================
// POST /api/subscription/create-portal-session
// Creates a Stripe Customer Portal session
// ============================================
router.post("/create-portal-session", authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: "No Stripe customer found. Please subscribe first." });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/jobseeker/premium`,
    });

    res.json({ portalUrl: session.url });
  } catch (err) {
    console.error("Error creating portal session:", err);
    res.status(500).json({ error: "Failed to create portal session." });
  }
});

// ============================================
// GET /api/admin/subscriptions
// Admin endpoint to list all subscriptions
// ============================================
router.get("/admin/subscriptions", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }

    const subscriptions = await Subscription.find({ status: { $in: ["active", "canceled", "past_due"] } })
      .populate("user", "name email avatar")
      .sort({ createdAt: -1 });

    const activeCount = subscriptions.filter((s) => s.status === "active").length;
    const totalRevenue = subscriptions
      .filter((s) => s.paymentStatus === "Paid")
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    res.json({
      subscriptions,
      stats: {
        totalRevenue,
        activeSubscriptions: activeCount,
        premiumUsers: activeCount,
      },
    });
  } catch (err) {
    console.error("Error fetching admin subscriptions:", err);
    res.status(500).json({ error: "Failed to fetch subscriptions." });
  }
});

export default router;

// ============================================
// Stripe Webhook Handler (exported separately)
// Must be used with express.raw() body parser
// ============================================
export async function stripeWebhookHandler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const plan = session.metadata.plan;
        const stripeSubscriptionId = session.subscription;
        const stripeCustomerId = session.customer;

        // Retrieve the subscription from Stripe to get period info
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const priceId = stripeSub.items.data[0].price.id;
        const interval = stripeSub.items.data[0].price.recurring.interval === "month" ? "monthly" : "yearly";
        const amount = interval === "monthly" ? 19.99 : 199.99;

        // Create subscription record
        await Subscription.create({
          user: userId,
          plan: "Premium",
          amount,
          paymentStatus: "Paid",
          validFrom: new Date(stripeSub.current_period_start * 1000),
          validUntil: new Date(stripeSub.current_period_end * 1000),
          stripeCustomerId,
          stripeSubscriptionId,
          stripePriceId: priceId,
          stripeSessionId: session.id,
          interval,
          status: "active",
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        });

        // Update user premium status
        await User.findByIdAndUpdate(userId, {
          isPremium: true,
          premiumExpiresAt: new Date(stripeSub.current_period_end * 1000),
          stripeCustomerId,
        });

        console.log(`✅ Subscription activated for user ${userId}`);
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object;
        const subscription = await Subscription.findOne({
          stripeSubscriptionId: stripeSub.id,
        });

        if (subscription) {
          subscription.status =
            stripeSub.status === "active" ? "active" :
            stripeSub.status === "past_due" ? "past_due" :
            stripeSub.status === "canceled" ? "canceled" : subscription.status;
          subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
          subscription.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
          subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
          subscription.validUntil = new Date(stripeSub.current_period_end * 1000);
          await subscription.save();

          // Update user premium status if canceled
          if (stripeSub.status === "canceled") {
            await User.findByIdAndUpdate(subscription.user, {
              isPremium: false,
            });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object;
        const subscription = await Subscription.findOne({
          stripeSubscriptionId: stripeSub.id,
        });

        if (subscription) {
          subscription.status = "canceled";
          await subscription.save();

          await User.findByIdAndUpdate(subscription.user, {
            isPremium: false,
          });
          console.log(`❌ Subscription canceled for user ${subscription.user}`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;

        if (stripeSubId) {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
          const subscription = await Subscription.findOne({
            stripeSubscriptionId: stripeSubId,
          });

          if (subscription) {
            subscription.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
            subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
            subscription.validUntil = new Date(stripeSub.current_period_end * 1000);
            subscription.paymentStatus = "Paid";
            await subscription.save();

            await User.findByIdAndUpdate(subscription.user, {
              premiumExpiresAt: new Date(stripeSub.current_period_end * 1000),
              isPremium: true,
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeSubId = invoice.subscription;

        if (stripeSubId) {
          const subscription = await Subscription.findOne({
            stripeSubscriptionId: stripeSubId,
          });

          if (subscription) {
            subscription.status = "past_due";
            subscription.paymentStatus = "Failed";
            await subscription.save();
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err);
  }

  // Always return 200 to acknowledge receipt
  res.json({ received: true });
}
