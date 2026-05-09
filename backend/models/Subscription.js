import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    plan: { type: String, enum: ["Basic", "Premium"], default: "Basic" },
    amount: { type: Number },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    validFrom: { type: Date },
    validUntil: { type: Date },
    transactionId: { type: String },

    // Stripe-specific fields
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String, unique: true, sparse: true },
    stripePriceId: { type: String },
    stripeSessionId: { type: String },
    interval: { type: String, enum: ["monthly", "yearly"] },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "incomplete"],
      default: "incomplete",
    },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    currentPeriodStart: { type: Date },
    currentPeriodEnd: { type: Date },
  },
  { timestamps: true }
);

const Subscription = mongoose.model("Subscription", SubscriptionSchema);
export default Subscription;
