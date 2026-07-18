import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";
import { IJob } from "./Job";

export interface ICoverLetter extends Document {
  userId: IUser["_id"];
  jobId: IJob["_id"];
  tone: "formal" | "friendly" | "confident";
  length: "short" | "medium" | "long";
  content: string;
  jobTitle: string;
  companyName: string;
  createdAt: Date;
}

const coverLetterSchema = new Schema<ICoverLetter>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    tone: { type: String, enum: ["formal", "friendly", "confident"], required: true },
    length: { type: String, enum: ["short", "medium", "long"], required: true },
    content: { type: String, required: true },
    jobTitle: { type: String, required: true },
    companyName: { type: String, required: true },
  },
  { timestamps: true }
);

coverLetterSchema.index({ userId: 1, createdAt: -1 });
coverLetterSchema.index({ userId: 1, jobId: 1 });

export const CoverLetter = mongoose.model<ICoverLetter>("CoverLetter", coverLetterSchema);
