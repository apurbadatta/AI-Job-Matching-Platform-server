import mongoose, { Schema, Document } from "mongoose";
import { IJob } from "./Job";
import { IUser } from "./User";

export interface IRecommendation extends Document {
  userId: IUser["_id"];
  jobId: IJob["_id"];
  score: number;
  reason: string;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

recommendationSchema.index({ userId: 1, jobId: 1 }, { unique: true });
recommendationSchema.index({ userId: 1, score: -1 });

export const Recommendation = mongoose.model<IRecommendation>("Recommendation", recommendationSchema);
