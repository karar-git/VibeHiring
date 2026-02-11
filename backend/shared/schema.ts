import { jsonb, pgTable, text, serial, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

// Users Table (email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Jobs Table (job offers with descriptions)
export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // open, closed, archived
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
});

// Candidates Table (CVs uploaded to a specific job)
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  resumeUrl: text("resume_url").notNull(),
  githubUrl: text("github_url"),
  cvText: text("cv_text"),

  // AI Analysis Results
  skills: jsonb("skills").$type<string[]>(),
  experience: jsonb("experience").$type<any[]>(),
  education: jsonb("education").$type<any[]>(),
  projects: jsonb("projects").$type<any[]>(),

  // Scoring & Ranking (relative to the job description)
  score: integer("score"),
  vibeCodingScore: integer("vibe_coding_score"),
  categoryScores: jsonb("category_scores").$type<Record<string, number>>(),
  analysisSummary: text("analysis_summary"),
  rankReason: text("rank_reason"),

  createdAt: timestamp("created_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
  jobId: integer("job_id").references(() => jobs.id),
});

// User Subscription / Usage Tracking
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  plan: text("plan").notNull().default("free"),
  cvCount: integer("cv_count").default(0),
  lastReset: timestamp("last_reset").defaultNow(),
});

// Zod Schemas
export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
  score: true,
  vibeCodingScore: true,
  categoryScores: true,
  analysisSummary: true,
  rankReason: true,
  cvText: true,
  skills: true,
  experience: true,
  education: true,
  projects: true,
});

export const insertSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  lastReset: true,
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Types
export type User = typeof users.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type InsertJob = z.infer<typeof insertJobSchema>;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidates.$inferSelect;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
