import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const resumeScansTable = pgTable("resume_scans", {
  id: serial("id").primaryKey(),
  atsScore: integer("ats_score").notNull(),
  targetRole: text("target_role"),
  summary: text("summary"),
  sections: jsonb("sections").notNull().$type<Array<{ name: string; score: number; feedback: string; suggestions: string[] }>>(),
  keywordsFound: jsonb("keywords_found").notNull().$type<string[]>(),
  keywordsMissing: jsonb("keywords_missing").notNull().$type<string[]>(),
  strengths: jsonb("strengths").notNull().$type<string[]>(),
  improvements: jsonb("improvements").notNull().$type<string[]>(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResumeScanSchema = createInsertSchema(resumeScansTable).omit({ id: true, scannedAt: true });
export type InsertResumeScan = z.infer<typeof insertResumeScanSchema>;
export type ResumeScan = typeof resumeScansTable.$inferSelect;
