import mongoose, { Schema, Document } from "mongoose";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject: string;
  message: string;
  read: boolean;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ContactMessage =
  mongoose.models.ContactMessage ||
  mongoose.model<IContactMessage>("ContactMessage", contactMessageSchema);
