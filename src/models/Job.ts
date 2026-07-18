import mongoose, { Schema, Document } from "mongoose";

export interface IJob extends Document {
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  location: string;
  salary: string;
  jobType: "full-time" | "part-time" | "remote";
  postedBy: mongoose.Types.ObjectId;
  deadline: Date;
  isFeatured: boolean;
  status: "pending" | "approved" | "rejected";
  companyLogo: string;
}

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    salary: { type: String, required: true },
    jobType: { type: String, enum: ["full-time", "part-time", "remote"], required: true },
    postedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    deadline: { type: Date, required: true },
    isFeatured: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    companyLogo: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Job = mongoose.models.Job || mongoose.model<IJob>("Job", jobSchema);
