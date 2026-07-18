import mongoose, { Schema, Document } from "mongoose";

export interface IRecommendation extends Document {
  user: mongoose.Types.ObjectId;
  job: mongoose.Types.ObjectId;
  score: number;
  reason: string;
}

const recommendationSchema = new Schema<IRecommendation>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    score: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

export const Recommendation = mongoose.models.Recommendation || mongoose.model<IRecommendation>("Recommendation", recommendationSchema);
