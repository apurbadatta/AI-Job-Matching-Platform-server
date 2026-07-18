import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { toNodeHandler } from "better-auth/node";
import { connectDB } from "./config/db";
import { auth } from "./lib/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS - must come before Better Auth handler
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://ai-job-matching-platform-three.vercel.app",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// Better Auth handler - must come before express.json()
app.all("/api/auth/{*path}", toNodeHandler(auth));

// JSON parsing for non-auth, non-webhook routes
app.use(express.json({ limit: "10mb" }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

import jobsRouter from "./routes/jobs";
import reviewsRouter from "./routes/reviews";
import aiRouter from "./routes/ai";
import paymentRouter from "./routes/payment";
import adminRouter from "./routes/admin";
import contactRouter from "./routes/contact";
import blogRouter from "./routes/blog";

// Jobs routes (public read, protected write)
app.use("/api/jobs", jobsRouter);

// Reviews routes
app.use("/api/reviews", reviewsRouter);

// AI routes
app.use("/api/ai", aiRouter);

// Payment routes (non-webhook)
app.use("/api/payment", paymentRouter);

// Admin routes (protected by hasRole middleware inside router)
app.use("/api/admin", adminRouter);

// Contact routes
app.use("/api/contact", contactRouter);

// Blog routes
app.use("/api/blog", blogRouter);

// Get current session (enriched with fresh DB data)
app.get("/api/auth/session", async (req, res) => {
  const result = await auth.api.getSession({
    headers: req.headers as any,
  });
  if (result?.user) {
    const db = mongoose.connection.db;
    if (db) {
      const freshUser = await db.collection("user").findOne(
        { _id: new mongoose.Types.ObjectId(result.user.id) },
        { projection: { _id: 0, name: 1, email: 1, role: 1, image: 1, companyName: 1, skills: 1, experience: 1, resumeUrl: 1, companyLogo: 1, companyDescription: 1, status: 1, isVerified: 1, jobPostCount: 1, "subscription.plan": 1, "subscription.status": 1 } }
      );
      if (freshUser) {
        result.user = { ...result.user, ...freshUser } as any;
      }
    }
  }
  res.json(result || { user: null, session: null });
});

// Profile update
import { isAuthenticated, hasRole, AuthRequest } from "./middleware/auth";
import { User } from "./models/User";

app.put("/api/profile", isAuthenticated, async (req: AuthRequest, res: express.Response) => {
  try {
    const { name, skills, experience, resumeUrl, companyName, companyDescription, companyLogo } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (skills !== undefined) update.skills = skills;
    if (experience !== undefined) update.experience = experience;
    if (resumeUrl !== undefined) update.resumeUrl = resumeUrl;
    if (companyName !== undefined) update.companyName = companyName;
    if (companyDescription !== undefined) update.companyDescription = companyDescription;
    if (companyLogo !== undefined) update.companyLogo = companyLogo;

    const user = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Employer setup after registration (candidate only — sets role + companyName)
app.post("/api/auth/setup-employer", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: express.Response) => {
  try {
    const { companyName } = req.body;
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return res.status(400).json({ error: "Company name is required" });
    }
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });
    await db.collection("user").updateOne(
      { _id: new mongoose.Types.ObjectId(req.user!.id) },
      { $set: { role: "employer", companyName: companyName.trim(), updatedAt: new Date() } }
    );
    res.json({ message: "Employer account setup complete" });
  } catch (error) {
    console.error("Employer setup error:", error);
    res.status(500).json({ error: "Failed to setup employer account" });
  }
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
