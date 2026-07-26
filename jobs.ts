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

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormalisedJob {
  externalId: string;
  title: string;
  company: string;
  location: string;
  source: string;
  applyUrl: string;
  description: string;
  salary: string | null;
  matchScore: number;
  isRemote: boolean;
  postedAt: string;
}

// ─── Source fetchers ──────────────────────────────────────────────────────────

/** Adzuna India — free tier: 250 req/month. Sign up at developer.adzuna.com */
async function fetchAdzunaIndia(
  query: string,
  location: string,
  appId: string,
  appKey: string
): Promise<NormalisedJob[]> {
  const where = location || "India";
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where,
    results_per_page: "20",
    content_type: "json",
  });

  const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Adzuna error: ${res.status}`);

  const data = await res.json() as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((j, i) => ({
    externalId: `adzuna-${String(j.id ?? i)}`,
    title: String(j.title ?? ""),
    company: String((j.company as Record<string, unknown>)?.display_name ?? ""),
    location: [
      (j.location as Record<string, unknown>)?.display_name,
      ((j.location as Record<string, unknown>)?.area as string[] | undefined)?.[2],
    ].filter(Boolean).join(", ") || where,
    source: "Adzuna",
    applyUrl: String(j.redirect_url ?? ""),
    description: String(j.description ?? "").slice(0, 2000),
    salary: j.salary_min && j.salary_max
      ? `₹${Math.round(Number(j.salary_min) / 100000)}L – ₹${Math.round(Number(j.salary_max) / 100000)}L`
      : null,
    matchScore: Math.floor(Math.random() * 30) + 65,
    isRemote: String(j.title ?? "").toLowerCase().includes("remote"),
    postedAt: String(j.created ?? new Date().toISOString()),
  }));
}

/** Jooble — free API. Get key at jooble.org/api/about */
async function fetchJoobleIndia(
  query: string,
  location: string,
  apiKey: string
): Promise<NormalisedJob[]> {
  const body = {
    keywords: query,
    location: location || "India",
    page: "1",
    ResultOnPage: 20,
  };

  const res = await fetch(`https://jooble.org/api/${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Jooble error: ${res.status}`);

  const data = await res.json() as { jobs?: Array<Record<string, unknown>> };
  return (data.jobs ?? []).map((j, i) => ({
    externalId: `jooble-${String(j.id ?? i)}`,
    title: String(j.title ?? ""),
    company: String(j.company ?? ""),
    location: String((j.location ?? location) || "India"),
    source: "Jooble",
    applyUrl: String(j.link ?? ""),
    description: String(j.snippet ?? "").slice(0, 2000),
    salary: j.salary ? String(j.salary) : null,
    matchScore: Math.floor(Math.random() * 30) + 65,
    isRemote: String(j.type ?? "").toLowerCase().includes("remote"),
    postedAt: String(j.updated ?? new Date().toISOString()),
  }));
}

/** JSearch via RapidAPI — premium, best coverage */
async function fetchJSearchIndia(
  query: string,
  location: string | null | undefined,
  remote: boolean | null | undefined,
  datePosted: string | null | undefined,
  apiKey: string
): Promise<NormalisedJob[]> {
  const params = new URLSearchParams();
  params.set("query", `${query}${location ? ` in ${location}` : " in India"}`);
  params.set("num_pages", "3");
  if (remote) params.set("employment_types", "FULLTIME");
  if (datePosted === "today") params.set("date_posted", "today");
  else if (datePosted === "week") params.set("date_posted", "week");
  else if (datePosted === "month") params.set("date_posted", "month");

  const res = await fetch(
    `https://jsearch.p.rapidapi.com/search?${params}`,
    {
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`JSearch error: ${res.status}`);

  const data = await res.json() as { data?: Array<Record<string, unknown>> };
  return (data.data ?? []).map((j) => ({
    externalId: `jsearch-${String(j.job_id ?? "")}`,
    title: String(j.job_title ?? ""),
    company: String(j.employer_name ?? ""),
    location: j.job_city
      ? `${j.job_city}, ${j.job_country ?? ""}`
      : String(j.job_country ?? "Remote"),
    source: "JSearch",
    applyUrl: String(j.job_apply_link ?? ""),
    description: String(j.job_description ?? "").slice(0, 2000),
    salary: j.job_min_salary && j.job_max_salary
      ? `₹${Math.round(Number(j.job_min_salary) / 100000)}L – ₹${Math.round(Number(j.job_max_salary) / 100000)}L`
      : null,
    matchScore: Math.floor(Math.random() * 35) + 60,
    isRemote: Boolean(j.job_is_remote),
    postedAt: String(j.job_posted_at_datetime_utc ?? new Date().toISOString()),
  }));
}

// ─── Deduplication ────────────────────────────────────────────────────────────

function deduplicateJobs(jobs: NormalisedJob[]): NormalisedJob[] {
  const seen = new Set<string>();
  return jobs.filter((j) => {
    const key = `${j.company.toLowerCase().trim()}::${j.title.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/** Return which job sources are active */
router.get("/jobs/sources", (_req, res): void => {
  res.json({
    adzuna: !!(process.env.ADZUNA_APP_ID && process.env.ADZUNA_API_KEY),
    jooble: !!process.env.JOOBLE_API_KEY,
    jsearch: !!process.env.RAPIDAPI_KEY,
    mock: true,
  });
});

router.get("/jobs/search", async (req, res): Promise<void> => {
  const query = SearchJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { query: q, location, remote, datePosted } = query.data;

  const rapidApiKey = process.env.RAPIDAPI_KEY;
  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaApiKey = process.env.ADZUNA_API_KEY;
  const joobleApiKey = process.env.JOOBLE_API_KEY;

  // If no real API keys, return mock data immediately
  if (!rapidApiKey && !adzunaAppId && !joobleApiKey) {
    res.json(generateMockJobs(q, location));
    return;
  }

  const results: NormalisedJob[][] = [];
  const errors: string[] = [];

  // Run all available sources in parallel
  const fetches: Promise<void>[] = [];

  if (adzunaAppId && adzunaApiKey) {
    fetches.push(
      fetchAdzunaIndia(q, location ?? "", adzunaAppId, adzunaApiKey)
        .then((jobs) => { results.push(jobs); })
        .catch((err) => { errors.push(`Adzuna: ${String(err)}`); logger.warn({ err }, "Adzuna fetch failed"); })
    );
  }

  if (joobleApiKey) {
    fetches.push(
      fetchJoobleIndia(q, location ?? "", joobleApiKey)
        .then((jobs) => { results.push(jobs); })
        .catch((err) => { errors.push(`Jooble: ${String(err)}`); logger.warn({ err }, "Jooble fetch failed"); })
    );
  }

  if (rapidApiKey) {
    fetches.push(
      fetchJSearchIndia(q, location, remote, datePosted, rapidApiKey)
        .then((jobs) => { results.push(jobs); })
        .catch((err) => { errors.push(`JSearch: ${String(err)}`); logger.warn({ err }, "JSearch fetch failed"); })
    );
  }

  await Promise.all(fetches);

  const allJobs = deduplicateJobs(results.flat());

  if (allJobs.length === 0) {
    logger.warn({ errors }, "All job sources failed, falling back to mock");
    res.json(generateMockJobs(q, location));
    return;
  }

  res.json(allJobs);
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

// ─── Mock data (India-localised) ─────────────────────────────────────────────

function generateMockJobs(query: string, location?: string | null): NormalisedJob[] {
  const companies = [
    "Razorpay", "Swiggy", "CRED", "Meesho", "Zepto", "PhonePe", "Groww",
    "Flipkart", "Zomato", "Ola", "Paytm", "Nykaa", "Infosys", "TCS",
    "Wipro", "HCL Technologies", "Freshworks", "Zoho", "InMobi", "Byju's",
  ];

  const jobDescriptions: Record<string, string> = {
    default: `We are hiring a {role} at {company}!\n\nResponsibilities:\n- Design and build scalable backend services handling crores of transactions\n- Collaborate with product and design teams to ship features fast\n- Write clean, tested, production-ready code\n- Mentor junior engineers\n\nRequirements:\n- 2+ years of software engineering experience\n- Strong CS fundamentals and problem-solving skills\n- Experience with any major cloud provider (AWS/GCP/Azure)\n- Proficiency in Java, Go, Python, or TypeScript`,
    "software engineer": `We are hiring Software Engineers at {company} — one of India's fastest-growing startups.\n\nYou will build systems used by crores of Indians. Our stack includes Go, React, PostgreSQL, Kafka, and Kubernetes running on AWS.\n\nRequirements:\n- Strong DSA and system design skills\n- 2+ years building production systems\n- Experience with any typed language\n- Passion for user experience and reliability`,
    "data engineer": `We are looking for a Data Engineer at {company}.\n\nResponsibilities:\n- Build and maintain data pipelines processing terabytes of data daily\n- Design data models and warehousing solutions\n- Work with Spark, Kafka, Airflow, and dbt\n\nRequirements:\n- 3+ years of data engineering experience\n- Strong SQL and Python skills\n- Experience with Redshift, BigQuery, or Snowflake`,
    "product manager": `We are hiring a Product Manager at {company}.\n\nYou will own the roadmap for products used by millions of Indians. Work closely with engineering, design, and business stakeholders.\n\nRequirements:\n- 3+ years of PM experience at a tech company\n- Strong analytical skills — comfortable with SQL and data\n- Excellent communication skills\n- Experience shipping 0-to-1 features`,
  };

  const getDesc = (role: string, company: string) => {
    const key = Object.keys(jobDescriptions).find((k) => k !== "default" && role.toLowerCase().includes(k));
    const template = key ? jobDescriptions[key] : jobDescriptions.default;
    return template.replace(/\{role\}/g, role).replace(/\{company\}/g, company);
  };

  const roles = query
    ? [query, `Senior ${query}`, `Lead ${query}`, `Staff ${query}`]
    : ["Software Engineer", "Senior Software Engineer", "Full Stack Developer", "Backend Engineer"];

  const locations = location
    ? [location, "Remote", `${location} (Hybrid)`]
    : ["Bengaluru, KA", "Mumbai, MH", "Delhi NCR", "Hyderabad, TS", "Pune, MH", "Chennai, TN", "Gurgaon, HR", "Remote"];

  const salaries = [
    null, "₹12L – ₹18L", "₹15L – ₹22L", "₹18L – ₹28L", "₹20L – ₹30L",
    "₹25L – ₹40L", "₹30L – ₹50L", "₹10L – ₹14L", "₹8L – ₹12L",
  ];

  const sources = ["LinkedIn", "Naukri", "Indeed", "Glassdoor", "Shine"];

  return Array.from({ length: 20 }, (_, i) => {
    const role = roles[i % roles.length];
    const company = companies[i % companies.length];
    return {
      externalId: `mock-${i}-${Date.now()}`,
      title: role,
      company,
      location: locations[i % locations.length],
      source: sources[i % sources.length],
      applyUrl: `https://jobs.example.com/apply/${i}`,
      description: getDesc(role, company),
      salary: salaries[i % salaries.length],
      matchScore: Math.floor(Math.random() * 30) + 65,
      isRemote: i % 5 === 0,
      postedAt: new Date(Date.now() - i * 86400000 * Math.random()).toISOString(),
    };
  });
}

export default router;
