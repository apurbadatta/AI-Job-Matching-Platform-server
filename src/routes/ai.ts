import { Router, Request, Response } from "express";
import { isAuthenticated, AuthRequest } from "../middleware/auth";

const router = Router();

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
