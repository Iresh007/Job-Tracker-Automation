import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, sql } from "drizzle-orm";
import { db, applicationsTable } from "@workspace/db";
import {
  CreateApplicationBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
  GetApplicationParams,
  DeleteApplicationParams,
  GetApplicationsQueryParams,
  BatchCreateApplicationsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/applications", async (req, res): Promise<void> => {
  const query = GetApplicationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status, search } = query.data;

  const conditions = [];
  if (status) {
    conditions.push(eq(applicationsTable.status, status));
  }
  if (search) {
    conditions.push(
      sql`(${ilike(applicationsTable.company, `%${search}%`)} OR ${ilike(applicationsTable.role, `%${search}%`)})`
    );
  }

  const apps = await db
    .select()
    .from(applicationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(applicationsTable.appliedAt));

  res.json(apps);
});

router.post("/applications", async (req, res): Promise<void> => {
  const parsed = CreateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid application body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const data = parsed.data;
  const insertData: Record<string, unknown> = {
    company: data.company,
    role: data.role,
    status: data.status ?? "applied",
    applyUrl: data.applyUrl ?? null,
    notes: data.notes ?? null,
    jobDescription: data.jobDescription ?? null,
    salary: data.salary ?? null,
    tailoredResume: data.tailoredResume ?? null,
    coverLetter: data.coverLetter ?? null,
    matchScore: data.matchScore ?? null,
  };

  if (data.appliedAt) {
    insertData.appliedAt = new Date(data.appliedAt);
  }

  const [app] = await db.insert(applicationsTable).values(insertData as typeof applicationsTable.$inferInsert).returning();
  res.status(201).json(app);
});

router.post("/applications/batch", async (req, res): Promise<void> => {
  const parsed = BatchCreateApplicationsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { jobs, dryRun } = parsed.data;

  if (dryRun) {
    res.status(201).json({ created: jobs.length, dryRun: true, applications: [] });
    return;
  }

  const inserted = await db
    .insert(applicationsTable)
    .values(
      jobs.map((j) => ({
        company: j.company,
        role: j.role,
        status: (j.status ?? "applied") as string,
        applyUrl: j.applyUrl ?? null,
        notes: j.notes ?? null,
        jobDescription: j.jobDescription ?? null,
        salary: j.salary ?? null,
        tailoredResume: j.tailoredResume ?? null,
        coverLetter: j.coverLetter ?? null,
        matchScore: j.matchScore ?? null,
        appliedAt: j.appliedAt ? new Date(j.appliedAt) : new Date(),
      }))
    )
    .returning();

  res.status(201).json({ created: inserted.length, dryRun: false, applications: inserted });
});

router.get("/applications/:id", async (req, res): Promise<void> => {
  const params = GetApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [app] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(app);
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  const params = UpdateApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [app] = await db
    .update(applicationsTable)
    .set(parsed.data)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json(app);
});

router.delete("/applications/:id", async (req, res): Promise<void> => {
  const params = DeleteApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [app] = await db
    .delete(applicationsTable)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
