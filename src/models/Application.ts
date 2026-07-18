import mongoose, { Schema, Document } from "mongoose";

export interface IApplication extends Document {
  job: mongoose.Types.ObjectId;
  candidate: mongoose.Types.ObjectId;
  resumeUrl: string;
  coverLetter: string;
  status: "pending" | "reviewed" | "accepted" | "rejected";
}

const applicationSchema = new Schema<IApplication>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    candidate: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resumeUrl: { type: String, default: "" },
    coverLetter: { type: String, default: "" },
    status: { type: String, enum: ["pending", "reviewed", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

export const Application = mongoose.models.Application || mongoose.model<IApplication>("Application", applicationSchema);
