import { Router, Request, Response } from "express";
import { Job } from "../models/Job";
import { User } from "../models/User";
import { Application } from "../models/Application";
import { isAuthenticated, AuthRequest, hasRole } from "../middleware/auth";

const router = Router();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Static routes first (before /:id)
router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await Job.distinct("category", { status: "approved" });
    res.json(categories.sort());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/locations", async (_req: Request, res: Response) => {
  try {
    const locations = await Job.distinct("location", { status: "approved" });
    res.json(locations.sort());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// List jobs with filtering (public)
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      search,
      category,
      location,
      jobType,
      sort = "newest",
      page = "1",
      limit = "12",
    } = req.query;

    const filter: any = { status: "approved" };

    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      filter.$or = [{ title: regex }, { shortDescription: regex }];
    }

    if (category && typeof category === "string" && category.trim()) {
      filter.category = category.trim();
    }

    if (location && typeof location === "string" && location.trim()) {
      filter.location = new RegExp(escapeRegex(location.trim()), "i");
    }

    if (jobType && typeof jobType === "string" && jobType.trim()) {
      filter.jobType = jobType.trim().toLowerCase();
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === "relevance") {
      sortOption = { isFeatured: -1, createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));
    const skip = (pageNum - 1) * pageSize;

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate("postedBy", "name companyName companyLogo")
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Job.countDocuments(filter),
    ]);

    res.json({
      jobs,
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

// Get employer's jobs (protected - employer only)
router.get("/employer", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const { page = "1", limit = "20", sort = "newest" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    let sortOption: any = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    else if (sort === "status") sortOption = { status: 1, createdAt: -1 };

    const [jobs, total] = await Promise.all([
      Job.find({ postedBy: req.user!.id })
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Job.countDocuments({ postedBy: req.user!.id }),
    ]);

    // Get applicant counts for each job
    const jobIds = jobs.map((j: any) => j._id);
    const applicantCounts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: "$job", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(applicantCounts.map((a: any) => [a._id.toString(), a.count]));
    const jobsWithCounts = jobs.map((job: any) => ({
      ...job,
      applicantsCount: countMap.get(job._id.toString()) || 0,
    }));

    res.json({
      jobs: jobsWithCounts,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching employer jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Create job (protected - employer only)
router.post("/", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      shortDescription,
      fullDescription,
      category,
      location,
      salary,
      jobType,
      deadline,
      companyLogo,
    } = req.body;

    // Validation
    if (!title || !shortDescription || !fullDescription || !category || !location || !salary || !jobType || !deadline) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check subscription limits
    const user: any = await User.findById(req.user!.id).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isPaidPlan = user.subscription?.plan === "pro" || user.subscription?.plan === "business";
    const isSubscriptionActive =
      user.subscription?.status === "active" || user.subscription?.status === "trialing";

    if (!isPaidPlan || !isSubscriptionActive) {
      // Free plan - check job post limit
      if (user.jobPostCount >= 3) {
        return res.status(403).json({
          error: "FREE_PLAN_LIMIT",
          message: "Free plan allows up to 3 job posts. Upgrade to Pro for unlimited.",
          jobPostCount: user.jobPostCount,
          limit: 3,
        });
      }
    }

    const job = await Job.create({
      title,
      shortDescription,
      fullDescription,
      category,
      location,
      salary,
      jobType,
      deadline: new Date(deadline),
      postedBy: req.user!.id,
      companyLogo: companyLogo || user.companyLogo || "",
      status: "pending",
    });

    // Increment job post count
    await User.findByIdAndUpdate(req.user!.id, { $inc: { jobPostCount: 1 } });

    res.status(201).json(job);
  } catch (error) {
    console.error("Error creating job:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// Delete job (protected - employer only, own jobs)
router.delete("/:id", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.postedBy.toString() !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to delete this job" });
    }

    await Job.findByIdAndDelete(req.params.id);

    // Decrement job post count
    await User.findByIdAndUpdate(req.user!.id, { $inc: { jobPostCount: -1 } });

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Get candidate's own applications
router.get("/my-applications", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = "1", limit = "10", status } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { candidate: userId };
    if (status && status !== "all") filter.status = status;

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .populate({ path: "job", populate: { path: "postedBy", select: "name companyName companyLogo" } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Application.countDocuments(filter),
    ]);

    res.json({
      applications,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Get single job (public)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("postedBy", "name companyName companyLogo companyDescription")
      .lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

// Get related jobs (same category, exclude current)
router.get("/:id/related", async (req: Request, res: Response) => {
  try {
    const currentJob: any = await Job.findById(req.params.id).lean();
    if (!currentJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    const relatedJobs = await Job.find({
      _id: { $ne: currentJob._id },
      category: currentJob.category,
      status: "approved",
    })
      .populate("postedBy", "name companyName companyLogo")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    res.json(relatedJobs);
  } catch (error) {
    console.error("Error fetching related jobs:", error);
    res.status(500).json({ error: "Failed to fetch related jobs" });
  }
});

// Apply to a job (candidate only)
router.post("/:id/apply", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
  try {
    const { coverLetter } = req.body;
    const jobId = req.params.id;
    const userId = req.user!.id;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const existing = await Application.findOne({ job: jobId, candidate: userId });
    if (existing) return res.status(400).json({ error: "You have already applied to this job" });

    const application = await Application.create({
      job: jobId,
      candidate: userId,
      coverLetter: coverLetter || "",
      status: "pending",
    });

    res.status(201).json({ success: true, application });
  } catch (error: any) {
    console.error("Error applying to job:", error);
    res.status(500).json({ error: "Failed to apply" });
  }
});

// Get applicants for a job (employer only, own jobs)
router.get("/:id/applicants", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.postedBy.toString() !== req.user!.id) return res.status(403).json({ error: "Not authorized" });

    const applications = await Application.find({ job: req.params.id })
      .populate("candidate", "name email skills experience resumeUrl")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ applications });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    res.status(500).json({ error: "Failed to fetch applicants" });
  }
});

// Update application status (employer only)
router.put("/:jobId/applications/:appId", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !["pending", "reviewed", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.postedBy.toString() !== req.user!.id) return res.status(403).json({ error: "Not authorized" });

    const application = await Application.findByIdAndUpdate(
      req.params.appId,
      { status },
      { new: true }
    );

    if (!application) return res.status(404).json({ error: "Application not found" });
    res.json({ success: true, application });
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({ error: "Failed to update application" });
  }
});

export default router;
