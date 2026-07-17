import { Router, Request, Response } from "express";
import { Review } from "../models/Review";
import { isAuthenticated, AuthRequest } from "../middleware/auth";

const router = Router();

// Get reviews for a company
router.get("/company/:companyId", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [reviews, total, stats] = await Promise.all([
      Review.find({ companyId: req.params.companyId })
        .populate("userId", "name profileImage")
        .populate("jobId", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Review.countDocuments({ companyId: req.params.companyId }),
      Review.aggregate([
        { $match: { companyId: req.params.companyId as any } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            totalReviews: { $sum: 1 },
            ratingCounts: { $push: "$rating" },
          },
        },
      ]),
    ]);

    const ratingDistribution = [0, 0, 0, 0, 0];
    if (stats.length > 0) {
      stats[0].ratingCounts.forEach((r: number) => {
        ratingDistribution[r - 1]++;
      });
    }

    res.json({
      reviews,
      pagination: { page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) },
      stats: {
        avgRating: stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0,
        totalReviews: stats.length > 0 ? stats[0].totalReviews : 0,
        ratingDistribution,
      },
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Create a review (authenticated)
router.post("/", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, companyId, rating, title, content, pros, cons, employmentStatus } = req.body;

    if (!jobId || !companyId || !rating || !title || !content || !employmentStatus) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const existingReview = await Review.findOne({
      userId: req.user!.id,
      jobId,
    });

    if (existingReview) {
      return res.status(409).json({ error: "You have already reviewed this job" });
    }

    const review = await Review.create({
      jobId,
      userId: req.user!.id,
      companyId,
      rating,
      title,
      content,
      pros: pros || "",
      cons: cons || "",
      employmentStatus,
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
