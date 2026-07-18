import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
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
app.all("/api/auth/{*path}", toNodeHandler(auth));

// CORS for regular routes
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

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

// Stripe webhook - must use raw body, mounted BEFORE json middleware would apply
// The payment router's webhook route handles express.raw() internally
app.post("/api/payment/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  paymentRouter(req, res, next);
});

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

// Get current session
app.get("/api/auth/session", async (req, res) => {
  const session = await auth.api.getSession({
    headers: req.headers as any,
  });
  res.json(session || { user: null, session: null });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
