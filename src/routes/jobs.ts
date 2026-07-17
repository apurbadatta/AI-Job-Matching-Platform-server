import { Router, Request, Response } from "express";
import { Job } from "../models/Job";

const router = Router();

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

    // Search by title or company name
    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ title: regex }, { shortDescription: regex }];
    }

    // Filter by category
    if (category && typeof category === "string" && category.trim()) {
      filter.category = new RegExp(`^${category.trim()}$`, "i");
    }

    // Filter by location
    if (location && typeof location === "string" && location.trim()) {
      filter.location = new RegExp(location.trim(), "i");
    }

    // Filter by job type
    if (jobType && typeof jobType === "string" && jobType.trim()) {
      filter.jobType = jobType.trim().toLowerCase();
    }

    // Sort options
    let sortOption: any = { createdAt: -1 }; // default: newest
    if (sort === "salary") {
      sortOption = { salary: -1 };
    } else if (sort === "relevance") {
      sortOption = { isFeatured: -1, createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
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

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("postedBy", "name companyName companyLogo")
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

export default router;
