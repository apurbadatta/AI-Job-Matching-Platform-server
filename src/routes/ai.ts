import { Router, Request, Response } from "express";
import { isAuthenticated, AuthRequest } from "../middleware/auth";
import { User } from "../models/User";
import { Job } from "../models/Job";
import { Interaction } from "../models/Interaction";
import { Recommendation } from "../models/Recommendation";
import { CoverLetter } from "../models/CoverLetter";

const router = Router();

// Generate AI job recommendations
router.post("/recommendations", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { preferredCategory, preferredLocation } = req.body;
    const userId = req.user!.id;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    // Fetch candidate profile
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch approved jobs
    const jobFilter: any = { status: "approved" };
    if (preferredCategory) jobFilter.category = preferredCategory;
    if (preferredLocation) jobFilter.location = new RegExp(preferredLocation, "i");

    const jobs = await Job.find(jobFilter)
      .populate("postedBy", "name companyName")
      .limit(50)
      .lean();

    if (jobs.length === 0) {
      return res.json({ recommendations: [], message: "No jobs found matching your criteria" });
    }

    // Fetch user interactions for context
    const interactions = await Interaction.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("job", "category jobType location")
      .lean();

    const interactedCategories = interactions
      .map((i) => (i.job as any)?.category)
      .filter(Boolean);
    const interactedTypes = interactions
      .map((i) => (i.job as any)?.jobType)
      .filter(Boolean);

    const interactionContext = interactions.length > 0
      ? `\nUser's recent interactions show interest in categories: ${[...new Set(interactedCategories)].join(", ")} and job types: ${[...new Set(interactedTypes)].join(", ")}.`
      : "";

    // Build jobs summary for AI
    const jobsSummary = jobs.map((job, idx) => {
      const company = job.postedBy as any;
      return `Job ${idx + 1} (ID: ${job._id}):
- Title: ${job.title}
- Category: ${job.category}
- Location: ${job.location}
- Type: ${job.jobType}
- Salary: ${job.salary}
- Description: ${job.shortDescription}`;
    }).join("\n\n");

    const candidateProfile = `
Candidate Profile:
- Name: ${user.name}
- Skills: ${user.skills?.length ? user.skills.join(", ") : "Not specified"}
- Experience: ${user.experience || "Not specified"}
- Preferred Category: ${preferredCategory || "Any"}
- Preferred Location: ${preferredLocation || "Any"}
${interactionContext}
`;

    const prompt = `You are an intelligent job recommendation engine. Score and rank jobs based on how well they match the candidate's profile.

${candidateProfile}

Available Jobs:
${jobsSummary}

TASK:
Analyze each job and return a JSON array of recommendations. For each job, provide:
1. "jobId": The job's ID (exactly as shown)
2. "score": A match score from 0-100 based on:
   - Skills alignment (40% weight)
   - Experience level match (25% weight)
   - Category preference match (20% weight)
   - Location/type preference match (15% weight)
3. "reason": A brief 1-2 sentence explanation of why this job matches or doesn't match

SCORING GUIDELINES:
- 90-100: Perfect match (skills, experience, preferences all align)
- 70-89: Strong match (most criteria met)
- 50-69: Moderate match (some criteria met)
- 30-49: Weak match (few criteria met)
- 0-29: Poor match

IMPORTANT:
- Return ONLY valid JSON array, no markdown or text before/after
- Include ALL jobs in your response
- Sort by score descending
- Consider the candidate's interaction history to boost similar categories

Return format: [{"jobId": "...", "score": 85, "reason": "..."}, ...]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      return res.status(500).json({ error: "Failed to generate recommendations" });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({ error: "No recommendations generated" });
    }

    // Parse JSON response
    let recommendations: { jobId: string; score: number; reason: string }[];
    try {
      // Clean the response - remove markdown code blocks if present
      const cleanedText = generatedText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recommendations = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", generatedText);
      return res.status(500).json({ error: "Failed to parse recommendations" });
    }

    // Save recommendations to database
    const bulkOps = recommendations.map((rec) => ({
      updateOne: {
        filter: { user: userId, job: rec.jobId },
        update: {
          $set: {
            score: Math.min(100, Math.max(0, rec.score)),
            reason: rec.reason,
          },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await Recommendation.bulkWrite(bulkOps);
    }

    // Fetch full job data for top recommendations
    const topJobIds = recommendations.slice(0, 10).map((r) => r.jobId);
    const fullJobs = await Job.find({ _id: { $in: topJobIds } })
      .populate("postedBy", "name companyName companyLogo")
      .lean();

    const jobMap = new Map(fullJobs.map((j) => [j._id.toString(), j]));

    const enrichedRecommendations = recommendations
      .slice(0, 10)
      .map((rec) => ({
        ...rec,
        job: jobMap.get(rec.jobId) || null,
      }))
      .filter((rec) => rec.job);

    res.json({
      recommendations: enrichedRecommendations,
      totalAnalyzed: jobs.length,
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// Track user interaction
router.post("/interactions", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, type } = req.body;
    const userId = req.user!.id;

    if (!jobId || !type) {
      return res.status(400).json({ error: "jobId and type are required" });
    }

    if (!["view", "apply", "save", "unsave"].includes(type)) {
      return res.status(400).json({ error: "Invalid interaction type" });
    }

    await Interaction.create({ user: userId, job: jobId, type });
    res.json({ success: true });
  } catch (error) {
    console.error("Interaction tracking error:", error);
    res.status(500).json({ error: "Failed to track interaction" });
  }
});

// Get user's saved jobs
router.get("/saved-jobs", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const savedInteractions = await Interaction.find({
      user: userId,
      type: "save",
    })
      .populate({
        path: "job",
        populate: { path: "postedBy", select: "name companyName companyLogo" },
      })
      .sort({ createdAt: -1 })
      .lean();

    const savedJobs = savedInteractions
      .map((i) => i.job)
      .filter(Boolean);

    res.json({ savedJobs });
  } catch (error) {
    console.error("Error fetching saved jobs:", error);
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
});

// Generate cover letter
router.post("/cover-letter", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, tone = "formal", length = "medium" } = req.body;
    const userId = req.user!.id;

    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    if (!["formal", "friendly", "confident"].includes(tone)) {
      return res.status(400).json({ error: "Invalid tone" });
    }

    if (!["short", "medium", "long"].includes(length)) {
      return res.status(400).json({ error: "Invalid length" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    // Fetch candidate profile
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch job details
    const job = await Job.findById(jobId)
      .populate("postedBy", "name companyName")
      .lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const company = job.postedBy as any;
    const companyName = company?.companyName || company?.name || "the company";

    // Tone instructions
    const toneInstructions: Record<string, string> = {
      formal: "Use a formal, professional tone. Avoid contractions and colloquialisms. Use complete sentences and proper business language.",
      friendly: "Use a warm, friendly tone while remaining professional. You may use some contractions and a more conversational style.",
      confident: "Use a confident, assertive tone. Highlight achievements boldly. Show enthusiasm and self-assurance.",
    };

    // Length instructions
    const lengthInstructions: Record<string, string> = {
      short: "Write a concise cover letter of 150-200 words (about 3-4 paragraphs).",
      medium: "Write a standard cover letter of 250-350 words (about 4-5 paragraphs).",
      long: "Write a detailed cover letter of 400-500 words (about 5-6 paragraphs).",
    };

    const prompt = `You are a professional cover letter writer. Write a personalized cover letter for the following candidate applying to a job.

CANDIDATE PROFILE:
- Name: ${user.name}
- Skills: ${user.skills?.length ? user.skills.join(", ") : "Not specified"}
- Experience: ${user.experience || "Not specified"}

JOB DETAILS:
- Position: ${job.title}
- Company: ${companyName}
- Location: ${job.location}
- Description: ${job.shortDescription}
- Full Description: ${job.fullDescription.substring(0, 1000)}

TONE: ${toneInstructions[tone]}

LENGTH: ${lengthInstructions[length]}

INSTRUCTIONS:
1. Start with a professional greeting (use "Dear Hiring Manager" if no specific name)
2. Opening paragraph: Hook the reader, mention the specific position and company
3. Body paragraphs: Connect candidate's skills/experience to job requirements. Use specific examples.
4. Closing paragraph: Express enthusiasm, include call to action
5. Professional sign-off with candidate's name

REQUIREMENTS:
- Do NOT use placeholder text like [Your Name] or [Company Name]
- Use the actual candidate name and company name provided
- Make it specific to this job, not generic
- Highlight relevant skills from the candidate's profile
- Keep paragraphs focused and well-structured

Return ONLY the cover letter text, no additional commentary or headers.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      return res.status(500).json({ error: "Failed to generate cover letter" });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({ error: "No cover letter generated" });
    }

    // Save to history
    const coverLetter = await CoverLetter.create({
      user: userId,
      job: jobId,
      tone,
      length,
      content: generatedText,
      jobTitle: job.title,
      companyName,
    });

    res.json({
      coverLetter: generatedText,
      id: coverLetter._id,
    });
  } catch (error) {
    console.error("Cover letter generation error:", error);
    res.status(500).json({ error: "Failed to generate cover letter" });
  }
});

// Get cover letter history
router.get("/cover-letters", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = "1", limit = "10" } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * pageSize;

    const [coverLetters, total] = await Promise.all([
      CoverLetter.find({ user: userId })
        .populate("job", "title companyLogo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      CoverLetter.countDocuments({ user: userId }),
    ]);

    res.json({
      coverLetters,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching cover letters:", error);
    res.status(500).json({ error: "Failed to fetch cover letters" });
  }
});

// Generate job description
router.post("/generate-description", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { bulletPoints, jobTitle, category, companyName } = req.body;

    if (!bulletPoints || !jobTitle) {
      return res.status(400).json({ error: "bulletPoints and jobTitle are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "AI service not configured" });
    }

    const prompt = `You are a professional job description writer for ${companyName || "a company"}.

Convert the following bullet points into a professional, detailed job description for the position of "${jobTitle}" in the "${category || "General"}" category.

Bullet Points:
${bulletPoints}

Requirements:
1. Write a compelling opening paragraph about the role
2. Expand each bullet point into detailed, professional paragraphs
3. Include a "Responsibilities" section
4. Include a "Requirements" section
5. Include a "Nice to Have" section if applicable
6. Use professional, inclusive language
7. Format in clean markdown
8. Keep it between 400-800 words
9. Do NOT include salary information
10. Do NOT include company-specific benefits (keep it generic)

Return ONLY the job description text, no additional commentary.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error:", errorData);
      return res.status(500).json({ error: "Failed to generate description" });
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({ error: "No content generated" });
    }

    res.json({ description: generatedText });
  } catch (error) {
    console.error("AI generation error:", error);
    res.status(500).json({ error: "Failed to generate description" });
  }
});

export default router;
