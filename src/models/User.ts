import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "candidate" | "employer" | "admin";
  status: string;
  skills: string[];
  experience: string;
  resumeUrl: string;
  companyName: string;
  companyLogo: string;
  companyDescription: string;
  isVerified: boolean;
  jobPostCount: number;
  subscription: {
    plan: string;
    status: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  };
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["candidate", "employer", "admin"], default: "candidate" },
    status: { type: String, default: "active" },
    skills: { type: [String], default: [] },
    experience: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
    companyName: { type: String, default: "" },
    companyLogo: { type: String, default: "" },
    companyDescription: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    jobPostCount: { type: Number, default: 0 },
    subscription: {
      plan: { type: String, default: "free" },
      status: { type: String, default: "inactive" },
      stripeCustomerId: { type: String, default: null },
      stripeSubscriptionId: { type: String, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false },
    },
  },
  { timestamps: true, collection: "user" }
);

export const User = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
