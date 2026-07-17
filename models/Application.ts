import mongoose, { Schema, Document } from "mongoose";
import { IJob } from "./Job";
import { IUser } from "./User";

export interface IApplication extends Document {
  jobId: IJob["_id"];
  userId: IUser["_id"];
  status: "pending" | "reviewed" | "accepted" | "rejected";
  appliedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "reviewed", "accepted", "rejected"], default: "pending" },
    appliedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

applicationSchema.index({ jobId: 1, userId: 1 }, { unique: true });
applicationSchema.index({ userId: 1 });
applicationSchema.index({ status: 1 });

export const Application = mongoose.model<IApplication>("Application", applicationSchema);
