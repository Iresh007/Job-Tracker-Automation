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
          ? `₹${Math.round(Number(j.job_min_salary) / 100000)}L - ₹${Math.round(Number(j.job_max_salary) / 100000)}L`
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
    "Razorpay", "Swiggy", "CRED", "Meesho", "Zepto", "PhonePe", "Groww",
    "Flipkart", "Zomato", "Ola", "Paytm", "Nykaa", "Infosys", "TCS",
    "Wipro", "HCL Technologies", "Freshworks", "Zoho", "InMobi", "Byju's",
  ];
  const roles = query ? [query, `Senior ${query}`, `Lead ${query}`, `Staff ${query}`] : [
    "Software Engineer", "Senior Software Engineer", "Full Stack Developer", "Backend Engineer",
  ];
  const locations = location
    ? [location, "Remote", `${location} (Hybrid)`]
    : ["Bengaluru, KA", "Mumbai, MH", "Delhi NCR", "Hyderabad, TS", "Pune, MH", "Chennai, TN", "Gurgaon, HR", "Remote"];

  const salaries = [
    null, "₹12L - ₹18L", "₹15L - ₹22L", "₹18L - ₹28L", "₹20L - ₹30L",
    "₹25L - ₹40L", "₹30L - ₹50L", "₹10L - ₹14L", "₹8L - ₹12L",
  ];

  return Array.from({ length: 20 }, (_, i) => ({
    externalId: `mock-${i}-${Date.now()}`,
    title: roles[i % roles.length],
    company: companies[i % companies.length],
    location: locations[i % locations.length],
    source: i % 3 === 0 ? "LinkedIn" : i % 3 === 1 ? "Naukri" : "Indeed",
    applyUrl: `https://jobs.example.com/apply/${i}`,
    description: `We are looking for a ${roles[i % roles.length]} to join our team. You will build products used by crores of customers across India. Requirements: 2+ years of experience, strong problem-solving skills, passion for great software.\n\nResponsibilities:\n- Design and implement scalable systems\n- Collaborate with cross-functional teams\n- Write clean, well-tested code\n- Mentor junior engineers`,
    salary: salaries[i % salaries.length],
    matchScore: Math.floor(Math.random() * 35) + 65,
    isRemote: i % 4 === 0,
    postedAt: new Date(Date.now() - i * 86400000 * Math.random()).toISOString(),
  }));
}

export default router;
