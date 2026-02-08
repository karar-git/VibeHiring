import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Export Auth and Chat models from blueprints
export * from "./models/auth";
export * from "./models/chat";

// Import users for foreign key reference
import { users } from "./models/auth";

// Candidates Table
export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  resumeUrl: text("resume_url").notNull(), // Path or URL to CV
  githubUrl: text("github_url"),
  cvText: text("cv_text"), // Extracted text
  
  // AI Analysis Results
  skills: jsonb("skills").$type<string[]>(),
  experience: jsonb("experience").$type<any[]>(), // Array of work experience objects
  education: jsonb("education").$type<any[]>(),
  projects: jsonb("projects").$type<any[]>(),
  
  // Scoring & Ranking
  score: integer("score"),
  vibeCodingScore: integer("vibe_coding_score"),
  analysisSummary: text("analysis_summary"),
  rankReason: text("rank_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  userId: varchar("user_id").references(() => users.id), // Owner of this candidate
});

// User Subscription / Usage Tracking
export const userSubscriptions = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  plan: text("plan").notNull().default("free"), // 'free', 'pro', 'enterprise'
  cvCount: integer("cv_count").default(0),
  lastReset: timestamp("last_reset").defaultNow(),
});

// Zod Schemas
export const insertCandidateSchema = createInsertSchema(candidates).omit({ 
  id: true, 
  createdAt: true,
  score: true,
  vibeCodingScore: true,
  analysisSummary: true,
  rankReason: true,
  cvText: true,
  skills: true,
  experience: true,
  education: true,
  projects: true
});

export const insertSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  lastReset: true
});

// Types
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
