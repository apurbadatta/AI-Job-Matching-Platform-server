import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  job: mongoose.Types.ObjectId;
  candidate: mongoose.Types.ObjectId;
  employer: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
}

const reviewSchema = new Schema<IReview>(
  {
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    candidate: { type: Schema.Types.ObjectId, ref: "User", required: true },
    employer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

export const Review = mongoose.models.Review || mongoose.model<IReview>("Review", reviewSchema);
