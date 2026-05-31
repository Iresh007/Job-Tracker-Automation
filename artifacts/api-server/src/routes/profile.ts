import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profileTable } from "@workspace/db";
import { UpsertProfileBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profile", async (req, res): Promise<void> => {
  const profiles = await db.select().from(profileTable).limit(1);
  if (!profiles[0]) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profiles[0]);
});

router.put("/profile", async (req, res): Promise<void> => {
  const parsed = UpsertProfileBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid profile body");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(profileTable).limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(profileTable)
      .set(parsed.data)
      .where(eq(profileTable.id, existing[0].id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(profileTable).values(parsed.data).returning();
    res.json(created);
  }
});

export default router;
