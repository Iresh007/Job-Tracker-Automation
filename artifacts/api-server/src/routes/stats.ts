import { Router, type IRouter } from "express";
import { sql, gte, and } from "drizzle-orm";
import { db, applicationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/stats/dashboard", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  // Total applications
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(applicationsTable);

  // Applied today
  const [{ todayCount }] = await db
    .select({ todayCount: sql<number>`count(*)::int` })
    .from(applicationsTable)
    .where(gte(applicationsTable.appliedAt, today));

  // Weekly count
  const [{ weekCount }] = await db
    .select({ weekCount: sql<number>`count(*)::int` })
    .from(applicationsTable)
    .where(gte(applicationsTable.appliedAt, weekAgo));

  // Status breakdown
  const statusRows = await db
    .select({
      status: applicationsTable.status,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationsTable)
    .groupBy(applicationsTable.status);

  const statusBreakdown = {
    applied: 0,
    interviewing: 0,
    rejected: 0,
    offer: 0,
    ghosted: 0,
  };
  for (const row of statusRows) {
    if (row.status in statusBreakdown) {
      statusBreakdown[row.status as keyof typeof statusBreakdown] = row.count;
    }
  }

  // Response rate: (interviewing + offer) / total * 100
  const responded = statusBreakdown.interviewing + statusBreakdown.offer;
  const responseRate = total > 0 ? Math.round((responded / total) * 100 * 10) / 10 : 0;

  // Streak: count consecutive days with at least 1 application going back from today
  const dailyRows = await db
    .select({
      day: sql<string>`DATE(applied_at AT TIME ZONE 'UTC')::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationsTable)
    .groupBy(sql`DATE(applied_at AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(applied_at AT TIME ZONE 'UTC') DESC`);

  let streakDays = 0;
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (dailyRows.length > 0) {
    // Streak starts from today or yesterday
    const startDay = dailyRows[0].day === todayStr || dailyRows[0].day === yesterdayStr
      ? dailyRows[0].day
      : null;

    if (startDay) {
      let current = new Date(startDay + "T00:00:00Z");
      for (const row of dailyRows) {
        const rowDate = new Date(row.day + "T00:00:00Z");
        const diffDays = Math.round((current.getTime() - rowDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          streakDays++;
          current = rowDate;
        } else {
          break;
        }
      }
    }
  }

  res.json({
    totalApplications: total,
    appliedToday: todayCount,
    dailyGoal: 50,
    streakDays,
    responseRate,
    weeklyCount: weekCount,
    statusBreakdown,
  });
});

router.get("/stats/daily", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      date: sql<string>`DATE(applied_at AT TIME ZONE 'UTC')::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(applicationsTable)
    .groupBy(sql`DATE(applied_at AT TIME ZONE 'UTC')`)
    .orderBy(sql`DATE(applied_at AT TIME ZONE 'UTC') ASC`);

  // Fill last 7 days
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = rows.find((r) => r.date === dateStr);
    result.push({ date: dateStr, count: found?.count ?? 0 });
  }

  res.json(result);
});

export default router;
