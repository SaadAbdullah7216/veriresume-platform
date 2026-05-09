import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String },
    linkedinId: { type: String },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["jobseeker", "hr", "admin"],
      default: "jobseeker",
    },
    company: { type: String }, // For HR
    isEmailVerified: { type: Boolean, default: false },

    // OTPs
    emailVerificationOTP: { type: String },
    otpExpires: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordOTPExpires: { type: Date },

    // Premium / Subscription info
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date },
    stripeCustomerId: { type: String },
  },
  { timestamps: true }
);

// Encrypt password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
UserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model("User", UserSchema);
export default User;
