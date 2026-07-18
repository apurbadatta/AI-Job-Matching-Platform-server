import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";
import { IJob } from "./Job";

export interface IInteraction extends Document {
  userId: IUser["_id"];
  jobId: IJob["_id"];
  type: "view" | "apply" | "save" | "unsave";
  createdAt: Date;
}

const interactionSchema = new Schema<IInteraction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    type: { type: String, enum: ["view", "apply", "save", "unsave"], required: true },
  },
  { timestamps: true }
);

interactionSchema.index({ userId: 1, jobId: 1 });
interactionSchema.index({ userId: 1, type: 1 });
interactionSchema.index({ createdAt: -1 });

export const Interaction = mongoose.model<IInteraction>("Interaction", interactionSchema);
