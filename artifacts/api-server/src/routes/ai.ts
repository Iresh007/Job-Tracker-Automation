import { Router, type IRouter } from "express";
import { db, profileTable } from "@workspace/db";
import { TailorResumeBody, GetMatchScoreBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

async function callOpenAI(messages: Array<{ role: string; content: string }>, model = "gpt-4o"): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices[0]?.message?.content ?? "";
}

router.post("/ai/tailor", async (req, res): Promise<void> => {
  const parsed = TailorResumeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { jobTitle, company, jobDescription, resumeText: inputResume } = parsed.data;

  // Get resume from profile if not provided
  let resumeText = inputResume;
  if (!resumeText) {
    const profiles = await db.select().from(profileTable).limit(1);
    resumeText = profiles[0]?.resumeText ?? "";
  }

  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasOpenAI) {
    // Return realistic mock data
    const mockKeywords = ["TypeScript", "React", "Node.js", "PostgreSQL", "REST API", "CI/CD", "Agile"];
    res.json({
      tailoredResume: resumeText || generateMockResume(jobTitle, company),
      coverLetter: generateMockCoverLetter(jobTitle, company, jobDescription),
      matchScore: 78,
      keywords: mockKeywords,
    });
    return;
  }

  try {
    const [tailoredResume, coverLetter, matchData] = await Promise.all([
      callOpenAI([
        {
          role: "system",
          content: "You are an expert resume writer and ATS optimization specialist. Tailor the given resume to match the job description while keeping it truthful and professional.",
        },
        {
          role: "user",
          content: `Job Title: ${jobTitle}\nCompany: ${company}\n\nJob Description:\n${jobDescription}\n\nOriginal Resume:\n${resumeText}\n\nPlease tailor the resume bullet points to better match this job description. Focus on relevant keywords and achievements. Return only the tailored resume text.`,
        },
      ]),
      callOpenAI([
        {
          role: "system",
          content: "You are an expert cover letter writer. Generate professional, personalized cover letters that are concise and compelling.",
        },
        {
          role: "user",
          content: `Write a 3-paragraph professional cover letter for:\nJob Title: ${jobTitle}\nCompany: ${company}\n\nJob Description:\n${jobDescription.slice(0, 1000)}\n\nResume:\n${resumeText?.slice(0, 800) ?? ""}\n\nReturn only the cover letter text, no subject line.`,
        },
      ]),
      callOpenAI([
        {
          role: "system",
          content: "You are an ATS optimization expert. Analyze resume-job description matches and return JSON only.",
        },
        {
          role: "user",
          content: `Analyze the ATS keyword match between this resume and job description.\n\nJob Description:\n${jobDescription.slice(0, 1000)}\n\nResume:\n${resumeText?.slice(0, 800) ?? ""}\n\nReturn JSON: {"score": number_0_to_100, "keywords": ["keyword1", "keyword2"]}`,
        },
      ]),
    ]);

    let score = 72;
    let keywords: string[] = [];
    try {
      const parsed = JSON.parse(matchData.replace(/```json\n?/g, "").replace(/```/g, "").trim());
      score = parsed.score ?? 72;
      keywords = parsed.keywords ?? [];
    } catch {
      // Use defaults
    }

    res.json({
      tailoredResume,
      coverLetter,
      matchScore: score,
      keywords,
    });
  } catch (err) {
    logger.error({ err }, "AI tailor error");
    res.status(500).json({ error: "AI service unavailable. Please check your OPENAI_API_KEY." });
  }
});

router.post("/ai/match-score", async (req, res): Promise<void> => {
  const parsed = GetMatchScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { resumeText, jobDescription } = parsed.data;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasOpenAI) {
    res.json({
      score: 74,
      matchedKeywords: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      missingKeywords: ["Kubernetes", "GraphQL", "AWS"],
    });
    return;
  }

  try {
    const result = await callOpenAI([
      {
        role: "system",
        content: "You are an ATS expert. Analyze resume-job matches. Return JSON only.",
      },
      {
        role: "user",
        content: `Analyze this resume vs job description for ATS keyword match.\n\nJob Description:\n${jobDescription.slice(0, 1200)}\n\nResume:\n${resumeText.slice(0, 1000)}\n\nReturn JSON: {"score": 0-100, "matchedKeywords": ["..."], "missingKeywords": ["..."]}`,
      },
    ]);

    const data = JSON.parse(result.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    res.json({
      score: data.score ?? 70,
      matchedKeywords: data.matchedKeywords ?? [],
      missingKeywords: data.missingKeywords ?? [],
    });
  } catch (err) {
    logger.error({ err }, "Match score error");
    res.status(500).json({ error: "AI service unavailable" });
  }
});

function generateMockResume(jobTitle: string, company: string): string {
  return `PROFESSIONAL EXPERIENCE

Senior Software Engineer | Previous Company | 2021–Present
• Architected and delivered scalable microservices handling 10M+ daily requests for ${company}-adjacent products
• Led migration of monolith to distributed system, reducing deployment time by 60%
• Mentored 4 junior engineers and established team coding standards for ${jobTitle} work
• Improved system reliability from 99.5% to 99.95% uptime through proactive monitoring

Software Engineer | StartupCo | 2019–2021
• Built full-stack features using TypeScript, React, and Node.js serving 500k+ users
• Optimized database queries reducing p99 latency by 40%
• Shipped 30+ features end-to-end including design, implementation, and monitoring

EDUCATION
B.S. Computer Science | State University | 2019

SKILLS
TypeScript, JavaScript, React, Node.js, PostgreSQL, Redis, AWS, Docker, Kubernetes`;
}

function generateMockCoverLetter(jobTitle: string, company: string, _description: string): string {
  return `Dear Hiring Team,

I am excited to apply for the ${jobTitle} position at ${company}. With over 5 years of experience building high-scale distributed systems and a proven track record of delivering impactful features, I am confident I would be a strong addition to your engineering team.

Throughout my career, I have developed deep expertise in the technologies and methodologies your team relies on. At my current role, I architected systems that handle millions of daily requests, led successful migrations that improved deployment velocity by 60%, and mentored engineers who have since become technical leads themselves. I bring both the hands-on technical depth and the collaborative mindset that thrives in fast-paced environments like ${company}.

What excites me most about ${company} is the opportunity to work on products that genuinely matter to users at scale. I would love to bring my experience and passion to your team. I look forward to the opportunity to discuss how I can contribute.

Best regards,
[Your Name]`;
}

export default router;
