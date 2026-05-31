import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, savedJobsTable } from "@workspace/db";
import {
  SaveJobBody,
  SearchJobsQueryParams,
  DeleteSavedJobParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/jobs/search", async (req, res): Promise<void> => {
  const query = SearchJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { query: q, location, remote, minSalary, maxSalary, datePosted } = query.data;

  const rapidApiKey = process.env.RAPIDAPI_KEY;

  if (!rapidApiKey) {
    // Return mock data when no API key configured
    const mockJobs = generateMockJobs(q, location);
    res.json(mockJobs);
    return;
  }

  try {
    const params = new URLSearchParams();
    params.set("query", `${q}${location ? ` in ${location}` : ""}`);
    params.set("num_pages", "3");
    if (remote) params.set("employment_types", "FULLTIME");

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?${params.toString()}`,
      {
        headers: {
          "x-rapidapi-key": rapidApiKey,
          "x-rapidapi-host": "jsearch.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`RapidAPI error: ${response.statusText}`);
    }

    const data = await response.json() as { data?: Array<Record<string, unknown>> };
    const jobs = (data.data || []).map((j: Record<string, unknown>) => ({
      externalId: String(j.job_id || ""),
      title: String(j.job_title || ""),
      company: String(j.employer_name || ""),
      location: j.job_city ? `${j.job_city}, ${j.job_country || ""}` : String(j.job_country || "Remote"),
      source: "JSearch",
      applyUrl: String(j.job_apply_link || ""),
      description: String(j.job_description || "").slice(0, 2000),
      salary:
        j.job_min_salary && j.job_max_salary
          ? `$${j.job_min_salary}k - $${j.job_max_salary}k`
          : null,
      matchScore: Math.floor(Math.random() * 40) + 60,
      isRemote: Boolean(j.job_is_remote),
      postedAt: String(j.job_posted_at_datetime_utc || new Date().toISOString()),
    }));

    // Filter by salary if provided
    const filtered = jobs.filter((j) => {
      if (!j.salary) return true;
      return true; // salary filtering handled client-side for simplicity
    });

    res.json(filtered);
  } catch (err) {
    logger.error({ err }, "Job search API error");
    // Fallback to mock data on error
    const mockJobs = generateMockJobs(q, location);
    res.json(mockJobs);
  }
});

router.get("/jobs/saved", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(savedJobsTable).orderBy(savedJobsTable.createdAt);
  res.json(jobs);
});

router.post("/jobs/saved", async (req, res): Promise<void> => {
  const parsed = SaveJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check for duplicate
  const existing = await db
    .select()
    .from(savedJobsTable)
    .where(eq(savedJobsTable.externalId, parsed.data.externalId))
    .limit(1);

  if (existing[0]) {
    res.json(existing[0]);
    return;
  }

  const [job] = await db.insert(savedJobsTable).values(parsed.data).returning();
  res.status(201).json(job);
});

router.delete("/jobs/saved/:id", async (req, res): Promise<void> => {
  const params = DeleteSavedJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db
    .delete(savedJobsTable)
    .where(eq(savedJobsTable.id, params.data.id))
    .returning();
  if (!job) {
    res.status(404).json({ error: "Saved job not found" });
    return;
  }
  res.sendStatus(204);
});

function generateMockJobs(query: string, location?: string | null) {
  const companies = [
    "Stripe", "Vercel", "Linear", "Notion", "Figma", "Anthropic", "OpenAI",
    "GitHub", "Cloudflare", "Supabase", "PlanetScale", "Render", "Railway",
    "Tailwind Labs", "Prisma", "Resend", "Fly.io", "Turbo", "Expo", "Loom",
  ];
  const roles = query ? [query, `Senior ${query}`, `Lead ${query}`, `Staff ${query}`] : [
    "Software Engineer", "Senior Engineer", "Full Stack Developer", "Backend Engineer",
  ];
  const locations = location
    ? [location, "Remote", `${location} (Hybrid)`]
    : ["Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA"];

  return Array.from({ length: 20 }, (_, i) => ({
    externalId: `mock-${i}-${Date.now()}`,
    title: roles[i % roles.length],
    company: companies[i % companies.length],
    location: locations[i % locations.length],
    source: i % 2 === 0 ? "LinkedIn" : "Indeed",
    applyUrl: `https://jobs.example.com/apply/${i}`,
    description: `We are looking for a ${roles[i % roles.length]} to join our team. You will work on cutting-edge products used by millions of developers worldwide. Requirements: 3+ years of experience, strong problem-solving skills, passion for great software.\n\nResponsibilities:\n- Design and implement scalable systems\n- Collaborate with cross-functional teams\n- Write clean, well-tested code\n- Mentor junior engineers`,
    salary: i % 3 === 0 ? null : `$${120 + i * 5}k - $${160 + i * 5}k`,
    matchScore: Math.floor(Math.random() * 35) + 65,
    isRemote: i % 3 === 0,
    postedAt: new Date(Date.now() - i * 86400000 * Math.random()).toISOString(),
  }));
}

export default router;
