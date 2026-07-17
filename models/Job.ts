import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";

export interface IJob extends Document {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  location: string;
  salary: string;
  jobType: "full-time" | "part-time" | "remote";
  postedBy: IUser["_id"];
  deadline: Date;
  status: "pending" | "approved" | "rejected";
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true, trim: true },
    shortDescription: { type: String, required: true, maxlength: 300 },
    fullDescription: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    salary: { type: String, required: true },
    jobType: { type: String, enum: ["full-time", "part-time", "remote"], required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

jobSchema.index({ postedBy: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ createdAt: -1 });

export const Job = mongoose.model<IJob>("Job", jobSchema);
