import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "candidate" | "employer" | "admin";
  status: "active" | "suspended" | "pending_verification";
  isVerified: boolean;
  profileImage: string;

  // Candidate-only
  skills: string[];
  experience: string;
  resumeUrl: string;

  // Employer-only
  companyName: string;
  companyLogo: string;
  companyDescription: string;

  // Subscription
  subscription: {
    plan: "free" | "pro" | "business";
    status: "active" | "canceled" | "past_due" | "trialing";
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: Date;
  };

  jobPostCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["candidate", "employer", "admin"], default: "candidate" },
    status: { type: String, enum: ["active", "suspended", "pending_verification"], default: "pending_verification" },
    isVerified: { type: Boolean, default: false },
    profileImage: { type: String, default: "" },

    // Candidate-only
    skills: { type: [String], default: [] },
    experience: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },

    // Employer-only
    companyName: { type: String, default: "" },
    companyLogo: { type: String, default: "" },
    companyDescription: { type: String, default: "" },

    // Subscription
    subscription: {
      plan: { type: String, enum: ["free", "pro", "business"], default: "free" },
      status: { type: String, enum: ["active", "canceled", "past_due", "trialing"], default: "active" },
      stripeCustomerId: { type: String, default: "" },
      stripeSubscriptionId: { type: String, default: "" },
      currentPeriodEnd: { type: Date, default: null },
    },

    jobPostCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ "subscription.stripeCustomerId": 1 });

export const User = mongoose.model<IUser>("User", userSchema);
