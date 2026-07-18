import { Router, Request, Response } from "express";
import { isAuthenticated, AuthRequest, hasRole } from "../middleware/auth";
import { User } from "../models/User";
import { Job } from "../models/Job";
import { Interaction } from "../models/Interaction";
import { Recommendation } from "../models/Recommendation";
import { CoverLetter } from "../models/CoverLetter";

const router = Router();

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Generate AI job recommendations (candidate only)
router.post("/recommendations", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
  try {
    const { preferredCategory, preferredLocation } = req.body;
    const userId = req.user!.id;

    const apiKey = process.env.GEMINI_API_KEY;

    // Fetch candidate profile
    const user: any = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch approved jobs
    const jobFilter: any = { status: "approved" };
    if (preferredCategory) jobFilter.category = preferredCategory;
    if (preferredLocation) jobFilter.location = new RegExp(escapeRegex(preferredLocation), "i");

    const jobs = await Job.find(jobFilter)
      .populate("postedBy", "name companyName")
      .limit(50)
      .lean();

    if (jobs.length === 0) {
      return res.json({ recommendations: [], message: "No jobs found matching your criteria" });
    }

    // If no API key, do rule-based fallback
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY — using rule-based recommendations");
      const userSkills = (user.skills || []).map((s: string) => s.toLowerCase());
      const enriched = jobs.map((job: any) => {
        let score = 50;
        const desc = (job.shortDescription || "").toLowerCase();
        const title = (job.title || "").toLowerCase();
        if (userSkills.length > 0) {
          const matched = userSkills.filter((s: string) => desc.includes(s) || title.includes(s));
          score += matched.length * 10;
        }
        if (preferredCategory && job.category === preferredCategory) score += 15;
        if (preferredLocation && (job.location || "").toLowerCase().includes(preferredLocation.toLowerCase())) score += 10;
        score = Math.min(100, Math.max(10, score));
        return { jobId: job._id.toString(), score, reason: "Rule-based match (AI unavailable)", job };
      });
      enriched.sort((a, b) => b.score - a.score);

      const bulkOps = enriched.map((rec) => ({
        updateOne: {
          filter: { user: userId, job: rec.jobId },
          update: { $set: { score: rec.score, reason: rec.reason } },
          upsert: true,
        },
      }));
      if (bulkOps.length > 0) await Recommendation.bulkWrite(bulkOps);

      return res.json({ recommendations: enriched.slice(0, 10), totalAnalyzed: jobs.length });
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
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", response.status, errorData);
      // Rule-based fallback
      const userSkills = (user.skills || []).map((s: string) => s.toLowerCase());
      const enriched = jobs.map((job: any) => {
        let score = 50;
        const desc = (job.shortDescription || "").toLowerCase();
        const title = (job.title || "").toLowerCase();
        if (userSkills.length > 0) {
          const matched = userSkills.filter((s: string) => desc.includes(s) || title.includes(s));
          score += matched.length * 10;
        }
        if (preferredCategory && job.category === preferredCategory) score += 15;
        score = Math.min(100, Math.max(10, score));
        return { jobId: job._id.toString(), score, reason: "AI unavailable — matched by skills and category", job };
      });
      enriched.sort((a, b) => b.score - a.score);
      const bulkOps = enriched.map((rec) => ({
        updateOne: { filter: { user: userId, job: rec.jobId }, update: { $set: { score: rec.score, reason: rec.reason } }, upsert: true },
      }));
      if (bulkOps.length > 0) await Recommendation.bulkWrite(bulkOps);
      return res.json({ recommendations: enriched.slice(0, 10), totalAnalyzed: jobs.length });
    }

    const data: any = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      const fallback = jobs.slice(0, 10).map((job: any) => ({
        jobId: job._id.toString(), score: 50, reason: "AI could not generate analysis", job,
      }));
      return res.json({ recommendations: fallback, totalAnalyzed: jobs.length });
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

    const jobMap = new Map(fullJobs.map((j: any) => [j._id.toString(), j]));

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

// Track user interaction (candidate only)
router.post("/interactions", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
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

// Get user's saved jobs (candidate only)
router.get("/saved-jobs", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
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

// Generate cover letter (candidate only)
router.post("/cover-letter", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
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

    // Fetch candidate profile
    const user: any = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch job details
    const job: any = await Job.findById(jobId)
      .populate("postedBy", "name companyName")
      .lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const company = job.postedBy as any;
    const companyName = company?.companyName || company?.name || "the company";

    // If no API key, return a template cover letter
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY — using cover letter template");
      const userName = user.name || "Applicant";
      const userSkills = user.skills?.length ? user.skills.join(", ") : "various technical skills";
      const userExp = user.experience || "several years of relevant";
      const template = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${companyName}. With ${userExp} experience and a skill set that includes ${userSkills}, I am confident I can make a meaningful contribution to your team.

Throughout my career, I have developed a deep understanding of the core competencies required for this role. My background in ${userSkills} aligns well with the requirements outlined in the job description. I am passionate about delivering high-quality work and thrive in collaborative environments.

I am particularly drawn to ${companyName} because of its commitment to innovation and excellence. I would welcome the opportunity to discuss how my experience and enthusiasm can contribute to your team's continued success.

Thank you for considering my application. I look forward to the opportunity to speak with you.

Sincerely,
${userName}`;

      const coverLetterRecord = await CoverLetter.create({
        user: userId, job: jobId, tone, length, content: template,
        jobTitle: job.title, companyName,
      });
      return res.json({ coverLetter: template, id: coverLetterRecord._id });
    }

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
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini cover letter error:", response.status, errorData);
      const userName = user.name || "Applicant";
      const userSkills = user.skills?.length ? user.skills.join(", ") : "various technical skills";
      const fallback = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${companyName}. With my background in ${userSkills}, I believe I am a strong candidate for this role.

I am eager to bring my skills and experience to your team and contribute to the continued success of ${companyName}. I would welcome the opportunity to discuss my qualifications further.

Thank you for your consideration.

Sincerely,
${userName}`;
      const record = await CoverLetter.create({
        user: userId, job: jobId, tone, length, content: fallback,
        jobTitle: job.title, companyName,
      });
      return res.json({ coverLetter: fallback, id: record._id });
    }

    const data: any = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      const userName = user.name || "Applicant";
      const fallback = `Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} role at ${companyName}. I am confident my skills and experience make me a strong fit.\n\nThank you for considering my application.\n\nSincerely,\n${userName}`;
      const record = await CoverLetter.create({
        user: userId, job: jobId, tone, length, content: fallback,
        jobTitle: job.title, companyName,
      });
      return res.json({ coverLetter: fallback, id: record._id });
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

// Get cover letter history (candidate only)
router.get("/cover-letters", isAuthenticated, hasRole(["candidate"]), async (req: AuthRequest, res: Response) => {
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

// Generate job description (employer only)
router.post("/generate-description", isAuthenticated, hasRole(["employer"]), async (req: AuthRequest, res: Response) => {
  try {
    const { bulletPoints, jobTitle, category, companyName } = req.body;

    if (!bulletPoints || !jobTitle) {
      return res.status(400).json({ error: "bulletPoints and jobTitle are required" });
    }

    const buildFallback = (note: string) => {
      const bullets = bulletPoints
        .split("\n")
        .map((l: string) => l.trim())
        .filter(Boolean)
        .map((l: string) => (l.startsWith("-") || l.startsWith("•") ? l : `- ${l}`))
        .join("\n");
      let desc = `# ${jobTitle}\n\n`;
      if (companyName) desc += `**Company:** ${companyName}\n`;
      if (category) desc += `**Category:** ${category}\n`;
      desc += `\n## About the Role\n\n${bullets}\n\n*${note}*`;
      return desc;
    };

    const apiKey = process.env.GEMINI_API_KEY;

    // If no API key, return formatted bullet points
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY — using bullet point template");
      return res.json({ description: buildFallback("AI service not configured. Please edit this draft.") });
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

    let fetchResponse: globalThis.Response;
    try {
      fetchResponse = await fetch(
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
    } catch (fetchErr) {
      console.error("Gemini fetch error:", fetchErr);
      return res.json({ description: buildFallback("AI service temporarily unreachable. This is an auto-generated draft.") });
    }

    if (!fetchResponse.ok) {
      console.error("Gemini API error:", fetchResponse.status);
      return res.json({ description: buildFallback("AI service temporarily unavailable. This is an auto-generated draft.") });
    }

    let data: any;
    try {
      data = await fetchResponse.json();
    } catch {
      console.error("Failed to parse Gemini response");
      return res.json({ description: buildFallback("AI response could not be parsed. This is an auto-generated draft.") });
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.json({ description: buildFallback("AI could not generate a description. This is an auto-generated draft.") });
    }

    res.json({ description: generatedText });
  } catch (error) {
    console.error("AI generation error:", error);
    res.status(500).json({ error: "Failed to generate description" });
  }
});

// AI Career Chatbot
router.post("/chat", isAuthenticated, async (req: AuthRequest, res: Response) => {
  try {
    const { messages } = req.body;
    const userId = req.user!.id;

    const apiKey = process.env.GEMINI_API_KEY;

    const user: any = await User.findById(userId).lean();
    const userName = user?.name || "User";
    const userSkills = user?.skills?.length ? user.skills.join(", ") : "Not specified";
    const userExperience = user?.experience || "Not specified";

    // Extract the latest user message for fallback
    const userMessages = (messages || []).filter((m: any) => m.role === "user");
    const latestUserQuery = userMessages.length > 0
      ? userMessages[userMessages.length - 1].text
      : "";

    if (!apiKey) {
      console.warn("No GEMINI_API_KEY — using chat fallback");
      return res.json({ reply: getFallbackReply(latestUserQuery) });
    }

    const systemPrompt = `You are JobPilot AI Career Assistant — a friendly, professional AI career advisor embedded in a job platform called JobPilot AI.

Your capabilities:
- Help candidates with job search, resume tips, interview prep, and career advice
- Help employers write better job descriptions
- Answer questions about the platform features
- Provide industry insights and salary negotiation tips

About the current user:
- Name: ${userName}
- Skills: ${userSkills}
- Experience: ${userExperience}

Guidelines:
- Be concise and helpful (2-4 sentences max unless detail is needed)
- Be warm and encouraging
- Give actionable advice
- Never repeat the same advice verbatim — vary your responses each time
- If asked about platform features, explain: job search, AI recommendations, cover letter generation, job posting, analytics
- If asked about something outside your scope, politely redirect to career topics
- Never make up job listings or company information
- Format responses with clear, readable text (you can use **bold** for emphasis)`;

    // Build messages for Gemini API (Gemini doesn't have a system role, so we include system instructions as the first user message)
    const geminiMessages: any[] = [];
    geminiMessages.push({ role: "user", parts: [{ text: systemPrompt }] });

    // Append conversation history (skip the initial assistant greeting and limit to last 10 messages)
    const conversationMessages = (messages || []).slice(-10);
    for (const msg of conversationMessages) {
      if (msg.role === "assistant" || msg.role === "user") {
        geminiMessages.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.text }],
        });
      }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini chat error:", response.status, errorData);
      const fallback = getFallbackReply(latestUserQuery);
      return res.json({ reply: fallback });
    }

    const data: any = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      const fallback = getFallbackReply(latestUserQuery);
      return res.json({ reply: fallback });
    }

    res.json({ reply: generatedText });
  } catch (error) {
    console.error("Chat error:", error);
    const fallback = getFallbackReply("help");
    res.json({ reply: fallback });
  }
});

const fallbackVariants: Record<string, string[]> = {
  resume: [
    "**Resume Tips:**\n\n1. **Keep it concise** — 1-2 pages max, focus on relevant experience\n2. **Use action verbs** — \"Led\", \"Built\", \"Increased\", \"Reduced\"\n3. **Quantify results** — \"Increased sales by 30%\" instead of \"Improved sales\"\n4. **Tailor to each job** — Match keywords from the job description\n5. **Proofread** — One typo can cost you an interview\n\nWould you like more specific advice?",
    "**Quick Resume Wins:**\n- Use a clean, ATS-friendly format\n- Lead with your strongest achievements\n- Include a skills section with both hard and soft skills\n- Remove outdated or irrelevant experience\n- Add a professional summary at the top\n\nWant me to elaborate on any of these?",
    "**Resume Checklist:**\n✓ Contact info at the top (email, phone, LinkedIn)\n✓ Strong opening summary tailored to the role\n✓ Bullet points start with action verbs\n✓ Numbers and metrics wherever possible\n✓ No typos or formatting inconsistencies\n\nWhat aspect of your resume would you like to improve?",
  ],
  interview: [
    "**Interview Preparation Tips:**\n\n1. **Research the company** — Know their mission, products, recent news\n2. **Practice STAR method** — Situation, Task, Action, Result for behavioral questions\n3. **Prepare questions** — Ask about team culture, growth opportunities\n4. **Dress appropriately** — Better overdressed than underdressed\n5. **Follow up** — Send a thank-you email within 24 hours\n\nWould you like tips on a specific type of interview?",
    "**Common Interview Questions:**\n- \"Tell me about yourself\" — Focus on your arc, not your life story\n- \"Why this company?\" — Show you've done your research\n- \"What's your greatest weakness?\" — Pick a real weakness and explain how you're improving\n- \"Where do you see yourself in 5 years?\" — Align with the company's trajectory\n\nWant a deep dive on any of these?",
    "**Before the Interview:**\n✓ Review the job description again\n✓ Prepare 3-5 stories showcasing key skills\n✓ Test your tech (camera, mic, internet)\n✓ Set up a quiet, well-lit space\n✓ Have water and notes nearby\n\nGood luck! You've got this!",
  ],
  salary: [
    "**Salary Negotiation Tips:**\n\n1. **Research market rates** — Use Glassdoor, LinkedIn Salary, Payscale\n2. **Know your worth** — Factor in experience, skills, location\n3. **Let them make the first offer** — Then negotiate from there\n4. **Consider total compensation** — Benefits, bonuses, equity, PTO\n5. **Be professional** — Express enthusiasm while advocating for yourself\n\nRemember: The worst they can say is no, and most employers expect negotiation!",
    "**Negotiation Script Ideas:**\n- \"I'm really excited about this role. Based on my research and experience, I was hoping for something in the range of $X-$Y.\"\n- \"Is there flexibility on the base salary? I'm also open to discussing sign-on bonus or equity.\"\n- \"What does the full compensation package look like beyond salary?\"\n\nPractice out loud before the conversation!",
    "**Beyond Base Salary:**\n✓ Sign-on bonuses\n✓ Annual performance bonuses\n✓ Stock options / RSUs\n✓ Remote work stipend\n✓ Professional development budget\n✓ Extra vacation time\n\nSometimes these are easier to negotiate than base pay!",
  ],
  jobsearch: [
    "**Job Search Strategies:**\n\n1. **Use JobPilot AI** — Our AI matches your skills with the best jobs automatically!\n2. **Optimize your profile** — Complete your skills and experience for better AI recommendations\n3. **Network actively** — 70% of jobs are filled through networking\n4. **Apply strategically** — Quality over quantity, tailor each application\n5. **Follow up** — A polite follow-up shows genuine interest\n\nTry clicking **\"Generate Recommendations\"** on your dashboard for AI-matched jobs!",
    "**Smart Job Search Tips:**\n- Set up job alerts so you never miss a posting\n- Apply within 48 hours of a job being posted for best odds\n- Customize your resume for each application (focus on matching keywords)\n- Use your network — referrals dramatically increase interview chances\n- Track your applications in a spreadsheet\n\nConsistency beats intensity!",
    "**The Hidden Job Market:**\n70-80% of jobs are never publicly posted. To tap into them:\n- Reach out to your network on LinkedIn\n- Attend industry events and meetups\n- Message recruiters directly\n- Join professional communities and Slack groups\n- Let people know you're looking\n\nWho in your network could you reach out to today?",
  ],
  skills: [
    "**Skill Development Tips:**\n\n1. **In-demand skills** — Check job postings in your field for trending technologies\n2. **Online courses** — Platforms like Coursera, Udemy, freeCodeCamp\n3. **Build projects** — Hands-on experience beats certificates\n4. **Contribute to open source** — Great for networking and learning\n5. **Stay updated** — Follow industry blogs, podcasts, and leaders\n\nWhat field are you in? I can suggest specific skills to focus on!",
    "**High-Impact Skills by Field:**\n- **Tech:** Python, cloud (AWS/Azure), AI/ML, cybersecurity\n- **Marketing:** SEO, content strategy, analytics, CRM tools\n- **Finance:** Financial modeling, data analysis, ERP systems\n- **Design:** Figma, UX research, design systems, prototyping\n\nWhat industry are you targeting?",
    "**Project Ideas to Build Skills:**\n- Build a portfolio website showcasing your work\n- Create a data dashboard with real datasets\n- Write blog posts or make tutorials about what you learn\n- Solve real problems with small automation scripts\n- Volunteer your skills for a nonprofit\n\nProjects stick better than courses!",
  ],
  platform: [
    "**JobPilot AI Features:**\n\n🔹 **AI Job Recommendations** — Get personalized job matches with match scores on your dashboard\n🔹 **AI Cover Letters** — Generate tailored cover letters for any job\n🔹 **AI Job Descriptions** — Employers can generate professional descriptions from bullet points\n🔹 **Smart Search** — Filter jobs by category, location, type, and salary\n🔹 **Application Tracking** — Track all your applications in one place\n🔹 **AI Career Chat** — That's me! Ask me anything about careers!\n\nWhich feature would you like to know more about?",
    "**JobPilot AI for Candidates:**\n✓ Personalized job recommendations powered by AI\n✓ One-click cover letter generation\n✓ Track applications from one dashboard\n✓ Get matched based on your skills and preferences\n✓ Career advice available 24/7\n\nReady to find your next role? Start by updating your profile!",
    "**JobPilot AI for Employers:**\n✓ Post jobs and reach qualified candidates\n✓ AI-powered job description generator\n✓ Review and manage applications\n✓ Company profile and branding\n✓ Analytics on your job postings\n\nLooking to hire? Check out the employer dashboard!",
  ],
  greeting: [
    "Hello! I'm here to help you with:\n\n• **Resume writing** and optimization\n• **Interview preparation** tips\n• **Salary negotiation** strategies\n• **Job search** advice\n• **Career development** guidance\n• **Platform features** of JobPilot AI\n\nWhat would you like to know?",
    "Hi there! I'm your JobPilot AI Career Assistant. I can help with:\n\n• Crafting a standout resume\n• Acing your interviews\n• Negotiating your salary\n• Finding the right job\n• Growing your career\n\nWhat's on your mind today?",
    "Hey! Welcome to JobPilot AI. I'm here to support your career journey. Ask me about:\n\n• Resume tips & templates\n• Interview strategies\n• Salary negotiations\n• Job search hacks\n• Platform features\n\nHow can I help you today?",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getFallbackReply(question: string): string {
  const q = question.toLowerCase();

  if (q.includes("resume") || q.includes("cv")) return pickRandom(fallbackVariants.resume);
  if (q.includes("interview")) return pickRandom(fallbackVariants.interview);
  if (q.includes("salary") || q.includes("negotiate")) return pickRandom(fallbackVariants.salary);
  if (q.includes("job") && (q.includes("search") || q.includes("find") || q.includes("match"))) return pickRandom(fallbackVariants.jobsearch);
  if (q.includes("skill") || q.includes("learn") || q.includes("improve")) return pickRandom(fallbackVariants.skills);
  if (q.includes("platform") || q.includes("jobpilot") || q.includes("feature")) return pickRandom(fallbackVariants.platform);
  if (q.includes("hello") || q.includes("hi") || q.includes("hey") || q.includes("help")) return pickRandom(fallbackVariants.greeting);

  return pickRandom([
    "That's a great question! While I'm temporarily running in basic mode (AI service at capacity), here's what I can help with:\n\n• **Resume tips** — Ask me about writing or improving your resume\n• **Interview prep** — Get ready for your next interview\n• **Salary negotiation** — Learn to negotiate with confidence\n• **Job search** — Strategies to find your dream job\n• **Platform help** — Learn about JobPilot AI features\n\nWhat interests you?",
    "I'd love to help with that! Here are the topics I know best:\n\n• **Resumes & CVs** — Optimization tips\n• **Interviews** — Prep and practice\n• **Salary** — Negotiation strategies\n• **Job searching** — Effective techniques\n• **JobPilot AI** — Platform features\n\nWhich one should we dive into?",
  ]);
}

export default router;
