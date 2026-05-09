import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import passport from "passport";
import session from "express-session";
import setupPassport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import apiRoutes from "./routes/api.js";
import subscriptionRoutes, { stripeWebhookHandler } from "./routes/subscription.js";
import User from "./models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Stripe webhook needs raw body — must be BEFORE express.json()
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());

// Serve uploaded files (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

connectDB();

// Seed admin on server start
const seedAdmin = async () => {
  try {
    const adminEmail = "saadabdullah7216@gmail.com";
    const exists = await User.findOne({ email: adminEmail });
    if (!exists) {
      await User.create({
        name: "Demo Admin",
        email: adminEmail,
        password: "admin123",
        role: "admin",
        isEmailVerified: true,
      });
      console.log("✅ Demo admin created:", adminEmail);
    } else {
      console.log("✅ Demo admin already exists:", adminEmail);
    }
  } catch (err) {
    console.error("Error seeding admin:", err);
  }
};

seedAdmin();

app.use(
  session({
    secret: process.env.SESSION_SECRET || "sesssecret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
setupPassport();

app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/api/subscription", subscriptionRoutes);

app.get("/api", (req, res) => res.json({ message: "API is working!" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
