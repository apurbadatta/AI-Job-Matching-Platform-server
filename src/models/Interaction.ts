import mongoose, { Schema, Document } from "mongoose";

export interface IInteraction extends Document {
  user: mongoose.Types.ObjectId;
  job: mongoose.Types.ObjectId;
  type: "view" | "apply" | "save" | "unsave";
}

const interactionSchema = new Schema<IInteraction>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    type: { type: String, enum: ["view", "apply", "save", "unsave"], required: true },
  },
  { timestamps: true }
);

export const Interaction = mongoose.models.Interaction || mongoose.model<IInteraction>("Interaction", interactionSchema);
