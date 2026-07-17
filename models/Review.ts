import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";
import { IJob } from "./Job";

export interface IReview extends Document {
  jobId: IJob["_id"];
  userId: IUser["_id"];
  companyId: IUser["_id"];
  rating: number;
  title: string;
  content: string;
  pros: string;
  cons: string;
  employmentStatus: "current" | "former";
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, maxlength: 1000 },
    pros: { type: String, default: "", maxlength: 500 },
    cons: { type: String, default: "", maxlength: 500 },
    employmentStatus: { type: String, enum: ["current", "former"], required: true },
  },
  { timestamps: true }
);

reviewSchema.index({ companyId: 1 });
reviewSchema.index({ jobId: 1 });
reviewSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>("Review", reviewSchema);
