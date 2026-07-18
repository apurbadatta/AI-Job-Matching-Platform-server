import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient, Db } from "mongodb";

// Only load .env locally (Render/Vercel set env vars directly)
if (process.env.NODE_ENV !== "production") {
  const dotenv = require("dotenv");
  const path = require("path");
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}

let client: MongoClient | undefined;
let db: Db | undefined;

if (process.env.MONGO_URI) {
  client = new MongoClient(process.env.MONGO_URI);
  db = client.db();
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
  database: db ? mongodbAdapter(db, { client: client! }) : undefined,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["candidate", "employer", "admin"] as const,
        required: false,
        defaultValue: "candidate",
        input: true,
      },
      status: {
        type: ["active", "suspended", "pending_verification"] as const,
        required: false,
        defaultValue: "active",
        input: false,
      },
      skills: {
        type: "string[]",
        required: false,
        defaultValue: [],
      },
      experience: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      resumeUrl: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      companyName: {
        type: "string",
        required: false,
        defaultValue: "",
        input: true,
      },
      companyLogo: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      companyDescription: {
        type: "string",
        required: false,
        defaultValue: "",
      },
      jobPostCount: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:3000"],
});

export type Session = typeof auth.$Infer.Session;
