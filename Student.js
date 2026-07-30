import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    atomicId: { type: String, unique: true, required: true, index: true }, // e.g. ATS-2026-000123
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },

    batch: {
      type: String,
      enum: ["Selection Pro Batch", "Selection 1.0 Batch", "Arambh Batch", "Manzil Batch", "No Batch"],
      default: "No Batch",
      required: true,
    },

    role: { type: String, enum: ["student", "admin", "superadmin"], default: "student" },

    subscription: {
      plan: { type: String, enum: ["free", "basic", "pro"], default: "free" },
      startedAt: { type: Date },
      expiresAt: { type: Date },
      isActive: { type: Boolean, default: false },
    },

    // daily free-question tracking for LOGGED-IN users without an active subscription
    dailyQuestionsUsed: { type: Number, default: 0 },
    lastQuestionDate: { type: String }, // stored as "YYYY-MM-DD", compared to today to auto-reset

    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpiresAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    refreshTokens: [{ type: String }],

    permissions: [{ type: String }],
  },
  { timestamps: true }
);

studentSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// true only if plan is active AND (no expiry set, or expiry is still in the future)
studentSchema.methods.hasActiveSubscription = function () {
  if (!this.subscription?.isActive) return false;
  if (this.subscription.expiresAt && new Date(this.subscription.expiresAt) < new Date()) return false;
  return true;
};

// Next.js hot-reload safe model registration
export default mongoose.models.Student || mongoose.model("Student", studentSchema);
