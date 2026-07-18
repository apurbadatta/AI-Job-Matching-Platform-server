import mongoose, { Schema, Document } from "mongoose";

export interface ICoverLetter extends Document {
  user: mongoose.Types.ObjectId;
  job: mongoose.Types.ObjectId;
  jobTitle: string;
  companyName: string;
  content: string;
  tone: string;
  length: string;
}

const coverLetterSchema = new Schema<ICoverLetter>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    jobTitle: { type: String, required: true },
    companyName: { type: String, required: true },
    content: { type: String, required: true },
    tone: { type: String, default: "professional" },
    length: { type: String, default: "medium" },
  },
  { timestamps: true }
);

export const CoverLetter = mongoose.models.CoverLetter || mongoose.model<ICoverLetter>("CoverLetter", coverLetterSchema);
