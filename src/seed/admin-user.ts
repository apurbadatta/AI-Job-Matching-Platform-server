import mongoose from "mongoose";
import dotenv from "dotenv";
import { auth } from "../lib/auth";

dotenv.config();

const ADMIN_USER = {
  email: "admin@jobpilot.ai",
  password: "Admin@12345",
  name: "Admin",
  role: "admin" as const,
};

async function seedAdmin() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("MONGO_URI is not defined in .env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await auth.api.findUserByEmail({
      email: ADMIN_USER.email,
    });

    if (existingAdmin) {
      console.log("Admin user already exists:", ADMIN_USER.email);
      console.log("Password:", ADMIN_USER.password);
      process.exit(0);
    }

    // Create admin user via Better Auth
    const result = await auth.api.signUpEmail({
      body: {
        email: ADMIN_USER.email,
        password: ADMIN_USER.password,
        name: ADMIN_USER.name,
      },
    });

    console.log("Admin user created successfully!");
    console.log("Email:", ADMIN_USER.email);
    console.log("Password:", ADMIN_USER.password);
    console.log("Role:", ADMIN_USER.role);
    console.log("\nUser ID:", result.user.id);

    // Update role to admin
    const db = mongoose.connection.db;
    if (db) {
      await db.collection("user").updateOne(
        { _id: result.user.id },
        { $set: { role: "admin" } }
      );
      console.log("Role set to 'admin'");
    }

    process.exit(0);
  } catch (error) {
    console.error("Admin seed error:", error);
    process.exit(1);
  }
}

seedAdmin();
