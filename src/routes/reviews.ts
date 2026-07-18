import { Router, Request, Response } from "express";
import { Review } from "../models/Review";
import { isAuthenticated, AuthRequest } from "../middleware/auth";

const router = Router();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Get reviews for a company (by employer user ID)
router.get("/company/:employerId", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * pageSize;

    const [reviews, total, stats] = await Promise.all([
      Review.find({ employer: req.params.employerId })
        .populate("candidate", "name")
        .populate("job", "title")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Review.countDocuments({ employer: req.params.employerId }),
      Review.aggregate([
        { $match: { employer: req.params.employerId as any } },
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
        if (r >= 1 && r <= 5) ratingDistribution[r - 1]++;
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
    const { jobId, employerId, rating, comment } = req.body;

    if (!jobId || !employerId || !rating || !comment) {
      return res.status(400).json({ error: "jobId, employerId, rating, and comment are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const existingReview = await Review.findOne({
      candidate: req.user!.id,
      job: jobId,
    });

    if (existingReview) {
      return res.status(409).json({ error: "You have already reviewed this job" });
    }

    const review = await Review.create({
      job: jobId,
      candidate: req.user!.id,
      employer: employerId,
      rating,
      comment,
    });

    res.status(201).json(review);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
});

export default router;
