import { jsonb, pgTable, text, serial, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
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
  role: varchar("role").notNull().default("hr"), // "hr" | "applicant"
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
  isPublic: boolean("is_public").notNull().default(false),
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

// Applications Table (public candidates applying to public jobs)
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  applicantName: text("applicant_name").notNull(),
  applicantEmail: text("applicant_email").notNull(),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("pending"), // pending, reviewed, shortlisted, rejected
  userId: varchar("user_id").references(() => users.id), // logged-in applicant's user ID
  createdAt: timestamp("created_at").defaultNow(),
});

// Interviews Table (AI voice interviews)
export const interviews = pgTable("interviews", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => jobs.id),
  candidateId: integer("candidate_id").references(() => candidates.id),
  applicationId: integer("application_id").references(() => applications.id),
  sessionId: varchar("session_id").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed, cancelled
  voice: varchar("voice").default("NATF2"),
  conversation: jsonb("conversation").$type<any[]>(),
  evaluation: jsonb("evaluation").$type<Record<string, any>>(),
  overallScore: integer("overall_score"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id),
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

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertInterviewSchema = createInsertSchema(interviews).omit({
  id: true,
  createdAt: true,
  conversation: true,
  evaluation: true,
  overallScore: true,
  completedAt: true,
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(["hr", "applicant"]).default("hr"),
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
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Interview = typeof interviews.$inferSelect;
export type InsertInterview = z.infer<typeof insertInterviewSchema>;
