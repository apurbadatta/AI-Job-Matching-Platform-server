import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import { ObjectId } from "mongodb";
import { auth } from "../lib/auth";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

dotenv.config();

const DEMO_USER = {
  email: "demo@jobpilot.ai",
  password: "Demo@12345",
  name: "Demo Candidate",
  role: "candidate" as const,
};

async function seed() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Check if demo user already exists
    const db0 = mongoose.connection.db;
    const existingUser = await db0?.collection("user").findOne({ email: DEMO_USER.email });

    if (existingUser) {
      console.log("Demo user already exists:", DEMO_USER.email);
      console.log("Password:", DEMO_USER.password);
      process.exit(0);
    }

    // Create demo user via Better Auth
    const result = await auth.api.signUpEmail({
      body: {
        email: DEMO_USER.email,
        password: DEMO_USER.password,
        name: DEMO_USER.name,
      },
    });

    console.log("Demo user created successfully!");
    console.log("Email:", DEMO_USER.email);
    console.log("Password:", DEMO_USER.password);
    console.log("Role:", DEMO_USER.role);
    console.log("\nUser ID:", result.user.id);

    // Update role to candidate
    if (db0) {
      await db0.collection("user").updateOne(
        { _id: new ObjectId(result.user.id) },
        { $set: { role: "candidate" } }
      );
      console.log("Role confirmed as 'candidate'");
    }

    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();
