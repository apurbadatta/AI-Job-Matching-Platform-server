import mongoose, { Schema, Document } from "mongoose";

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  readTime: string;
  image: string;
  published: boolean;
}

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    excerpt: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    author: { type: String, default: "JobPilot Team" },
    readTime: { type: String, default: "5 min read" },
    image: { type: String, default: "" },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const BlogPost =
  mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>("BlogPost", blogPostSchema);
