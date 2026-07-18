import { Router, Request, Response } from "express";
import { BlogPost } from "../models/BlogPost";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { category, page = "1", limit = "10" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { published: true };
    if (category && category !== "All") {
      filter.category = category;
    }

    const [posts, total] = await Promise.all([
      BlogPost.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).select("-content"),
      BlogPost.countDocuments(filter),
    ]);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Blog list error:", error);
    res.status(500).json({ error: "Failed to fetch blog posts" });
  }
});

router.get("/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await BlogPost.distinct("category", { published: true });
    res.json(["All", ...categories]);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/:slug", async (req: Request, res: Response) => {
  try {
    const post = await BlogPost.findOne({
      slug: req.params.slug,
      published: true,
    });

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.json(post);
  } catch (error: any) {
    console.error("Blog detail error:", error);
    res.status(500).json({ error: "Failed to fetch blog post" });
  }
});

export default router;
