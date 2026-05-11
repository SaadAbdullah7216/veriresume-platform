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

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// Stripe webhook needs raw body — must be BEFORE express.json()
app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(express.json());

// Serve uploaded files (avatars, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

connectDB();



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
