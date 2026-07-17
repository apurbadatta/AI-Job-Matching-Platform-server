import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { toNodeHandler } from "better-auth/node";
import { connectDB } from "./config/db";
import { auth } from "./lib/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Better Auth handler - must come before express.json()
app.all("/api/auth/*", toNodeHandler(auth));

// CORS for regular routes
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// JSON parsing for non-auth routes
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Protected route examples
import { isEmployer, isCandidate, isAdmin } from "./middleware/auth";
import { AuthRequest } from "./middleware/auth";
import jobsRouter from "./routes/jobs";

// Jobs routes (public read, protected write)
app.use("/api/jobs", jobsRouter);

// Employer-only routes
app.get("/api/jobs/manage", isEmployer, (req: AuthRequest, res) => {
  res.json({ message: "Employer dashboard", user: req.user });
});

// Get current session
app.get("/api/auth/session", async (req, res) => {
  const session = await auth.api.getSession({
    headers: req.headers as any,
  });
  res.json(session || { user: null, session: null });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
