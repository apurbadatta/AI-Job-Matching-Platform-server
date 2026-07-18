import { Router, Request, Response } from "express";
import { isAuthenticated, AuthRequest, hasRole } from "../middleware/auth";
import mongoose from "mongoose";

const router = Router();

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);
const getId = (id: string | string[]) => (Array.isArray(id) ? id[0] : id);

// All admin routes require admin role
router.use(isAuthenticated);
router.use(hasRole(["admin"]));

// ==================== USERS ====================

// Get all users with pagination and search
router.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const { page = "1", limit = "20", search = "", role = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const filter: any = {};
    if (search && typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }
    if (role && typeof role === "string" && ["candidate", "employer"].includes(role)) {
      filter.role = role;
    }

    const [users, total] = await Promise.all([
      db.collection("user")
        .find(filter)
        .project({ name: 1, email: 1, role: 1, status: 1, createdAt: 1, isVerified: 1 })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      db.collection("user").countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Suspend user
router.post("/users/:id/suspend", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const id = getId(req.params.id);
    await db.collection("user").updateOne(
      { _id: toObjectId(id) },
      { $set: { status: "suspended", updatedAt: new Date() } }
    );

    res.json({ message: "User suspended" });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ error: "Failed to suspend user" });
  }
});

// Activate user
router.post("/users/:id/activate", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const id = getId(req.params.id);
    await db.collection("user").updateOne(
      { _id: toObjectId(id) },
      { $set: { status: "active", updatedAt: new Date() } }
    );

    res.json({ message: "User activated" });
  } catch (error) {
    console.error("Error activating user:", error);
    res.status(500).json({ error: "Failed to activate user" });
  }
});

// Toggle employer verification
router.post("/users/:id/verify", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const id = getId(req.params.id);
    const user = await db.collection("user").findOne({ _id: toObjectId(id) });
    if (!user) return res.status(404).json({ error: "User not found" });

    const currentVerified = (user as any).isVerified || false;
    await db.collection("user").updateOne(
      { _id: toObjectId(id) },
      { $set: { isVerified: !currentVerified, updatedAt: new Date() } }
    );

    res.json({ message: currentVerified ? "User unverified" : "User verified", isVerified: !currentVerified });
  } catch (error) {
    console.error("Error toggling verification:", error);
    res.status(500).json({ error: "Failed to toggle verification" });
  }
});

// ==================== JOBS ====================

// Get all jobs (admin view - all statuses)
router.get("/jobs", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const { page = "1", limit = "20", status = "", search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const filter: any = {};
    if (status && typeof status === "string" && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }
    if (search && typeof search === "string" && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [{ title: regex }, { category: regex }];
    }

    const [jobs, total] = await Promise.all([
      db.collection("job")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      db.collection("job").countDocuments(filter),
    ]);

    // Manually populate postedBy
    const userIds = [...new Set(jobs.map((j: any) => j.postedBy?.toString()).filter(Boolean))];
    const users = userIds.length > 0
      ? await db.collection("user").find({ _id: { $in: userIds.map(toObjectId) } })
          .project({ name: 1, companyName: 1 })
          .toArray()
      : [];
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const enrichedJobs = jobs.map((job: any) => ({
      ...job,
      postedBy: userMap.get(job.postedBy?.toString()) || { name: "Unknown" },
    }));

    res.json({
      jobs: enrichedJobs,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Approve job
router.post("/jobs/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    await db.collection("job").updateOne(
      { _id: toObjectId(getId(req.params.id)) },
      { $set: { status: "approved", updatedAt: new Date() } }
    );

    res.json({ message: "Job approved" });
  } catch (error) {
    console.error("Error approving job:", error);
    res.status(500).json({ error: "Failed to approve job" });
  }
});

// Reject job
router.post("/jobs/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    await db.collection("job").updateOne(
      { _id: toObjectId(getId(req.params.id)) },
      { $set: { status: "rejected", updatedAt: new Date() } }
    );

    res.json({ message: "Job rejected" });
  } catch (error) {
    console.error("Error rejecting job:", error);
    res.status(500).json({ error: "Failed to reject job" });
  }
});

// Delete job
router.delete("/jobs/:id", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    await db.collection("job").deleteOne({ _id: toObjectId(getId(req.params.id)) });

    res.json({ message: "Job deleted" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Toggle featured
router.post("/jobs/:id/feature", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const id = getId(req.params.id);
    const job = await db.collection("job").findOne({ _id: toObjectId(id) });
    if (!job) return res.status(404).json({ error: "Job not found" });

    const currentFeatured = (job as any).isFeatured || false;
    await db.collection("job").updateOne(
      { _id: toObjectId(id) },
      { $set: { isFeatured: !currentFeatured, updatedAt: new Date() } }
    );

    res.json({ message: currentFeatured ? "Job unfeatured" : "Job featured", isFeatured: !currentFeatured });
  } catch (error) {
    console.error("Error toggling featured:", error);
    res.status(500).json({ error: "Failed to toggle featured" });
  }
});

// ==================== ANALYTICS ====================

// Dashboard stats
router.get("/analytics/stats", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const [
      totalUsers,
      totalCandidates,
      totalEmployers,
      totalJobs,
      pendingJobs,
      approvedJobs,
      rejectedJobs,
      activeSubscriptions,
    ] = await Promise.all([
      db.collection("user").countDocuments({}),
      db.collection("user").countDocuments({ role: "candidate" }),
      db.collection("user").countDocuments({ role: "employer" }),
      db.collection("job").countDocuments({}),
      db.collection("job").countDocuments({ status: "pending" }),
      db.collection("job").countDocuments({ status: "approved" }),
      db.collection("job").countDocuments({ status: "rejected" }),
      db.collection("user").countDocuments({
        "subscription.plan": { $in: ["pro", "business"] },
        "subscription.status": "active",
      }),
    ]);

    res.json({
      totalUsers,
      totalCandidates,
      totalEmployers,
      totalJobs,
      pendingJobs,
      approvedJobs,
      rejectedJobs,
      activeSubscriptions,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Users over time (last 12 months)
router.get("/analytics/users-over-time", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const result = await db.collection("user").aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            role: "$role",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]).toArray();

    const monthMap: Record<string, { month: string; candidates: number; employers: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = { month: key, candidates: 0, employers: 0 };
    }

    result.forEach((r: any) => {
      const key = r._id.month;
      if (monthMap[key]) {
        if (r._id.role === "candidate") monthMap[key].candidates = r.count;
        else if (r._id.role === "employer") monthMap[key].employers = r.count;
      }
    });

    res.json(Object.values(monthMap));
  } catch (error) {
    console.error("Error fetching users over time:", error);
    res.status(500).json({ error: "Failed to fetch users over time" });
  }
});

// Jobs posted per month (last 12 months)
router.get("/analytics/jobs-over-time", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const result = await db.collection("job").aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray();

    const monthMap: Record<string, { month: string; count: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = { month: key, count: 0 };
    }

    result.forEach((r: any) => {
      if (monthMap[r._id]) monthMap[r._id].count = r.count;
    });

    res.json(Object.values(monthMap));
  } catch (error) {
    console.error("Error fetching jobs over time:", error);
    res.status(500).json({ error: "Failed to fetch jobs over time" });
  }
});

// Job categories distribution
router.get("/analytics/categories", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const result = await db.collection("job").aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();

    const colors = [
      "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981",
      "#EF4444", "#06B6D4", "#6366F1", "#84CC16", "#F97316",
    ];

    const data = result.map((r: any, i: number) => ({
      name: r._id || "Other",
      value: r.count,
      color: colors[i % colors.length],
    }));

    res.json(data);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Subscription revenue
router.get("/analytics/revenue", async (req: AuthRequest, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) return res.status(500).json({ error: "Database not connected" });

    const result = await db.collection("user").aggregate([
      {
        $match: {
          "subscription.plan": { $in: ["pro", "business"] },
          "subscription.status": "active",
        },
      },
      {
        $group: {
          _id: "$subscription.plan",
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const revenueMap: Record<string, { plan: string; revenue: number; count: number }> = {
      pro: { plan: "Pro ($9.99)", revenue: 0, count: 0 },
      business: { plan: "Business ($29.99)", revenue: 0, count: 0 },
    };

    result.forEach((r: any) => {
      if (revenueMap[r._id]) {
        revenueMap[r._id].count = r.count;
        revenueMap[r._id].revenue = r._id === "pro" ? r.count * 9.99 : r.count * 29.99;
      }
    });

    res.json(Object.values(revenueMap));
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({ error: "Failed to fetch revenue" });
  }
});

export default router;
