import { candidates, jobs, userSubscriptions, users, applications, interviews, type User } from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, count, avg, and, sql } from "drizzle-orm";

export class DatabaseStorage {
  // Auth
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(email: string, passwordHash: string, firstName?: string, lastName?: string, role?: string): Promise<User> {
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
      role: role || "hr",
    }).returning();
    return user;
  }

  // Jobs
  async createJob(job: any) {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async getJob(id: number) {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async listJobs(userId: string) {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt));
  }

  async updateJob(id: number, data: { title?: string; description?: string; status?: string; isPublic?: boolean }) {
    const [updated] = await db
      .update(jobs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(jobs.id, id))
      .returning();
    return updated;
  }

  async deleteJob(id: number) {
    // Delete all candidates for this job first
    await db.delete(candidates).where(eq(candidates.jobId, id));
    await db.delete(jobs).where(eq(jobs.id, id));
  }

  async getJobStats(userId: string) {
    const jobsList = await this.listJobs(userId);
    const totalJobs = jobsList.length;
    const openJobs = jobsList.filter(j => j.status === "open").length;

    const candidateRows = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.userId, userId));
    const totalCandidates = candidateRows[0]?.count || 0;

    const avgRows = await db
      .select({ avg: avg(candidates.score) })
      .from(candidates)
      .where(eq(candidates.userId, userId));
    const avgScore = Math.round(Number(avgRows[0]?.avg) || 0);

    return { totalJobs, openJobs, totalCandidates, avgScore };
  }

  // Candidates (scoped to a job)
  async createCandidate(candidate: any) {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    return newCandidate;
  }

  async getCandidate(id: number) {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate;
  }

  async listCandidates(userId: string) {
    return db
      .select()
      .from(candidates)
      .where(eq(candidates.userId, userId))
      .orderBy(desc(candidates.score));
  }

  async listCandidatesByJob(jobId: number) {
    return db
      .select()
      .from(candidates)
      .where(eq(candidates.jobId, jobId))
      .orderBy(desc(candidates.score));
  }

  async getCandidateCountByJob(jobId: number) {
    const rows = await db
      .select({ count: count() })
      .from(candidates)
      .where(eq(candidates.jobId, jobId));
    return rows[0]?.count || 0;
  }

  async deleteCandidate(id: number) {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  // Subscriptions
  async getSubscription(userId: string) {
    const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, userId));
    return sub;
  }

  async createSubscription(userId: string) {
    const [sub] = await db.insert(userSubscriptions).values({ userId }).returning();
    return sub;
  }

  async updateSubscription(userId: string, plan: string) {
    const [sub] = await db
      .update(userSubscriptions)
      .set({ plan })
      .where(eq(userSubscriptions.userId, userId))
      .returning();
    return sub;
  }

  async incrementCvCount(userId: string) {
    const sub = await this.getSubscription(userId);
    if (sub) {
      await db
        .update(userSubscriptions)
        .set({ cvCount: (sub.cvCount || 0) + 1 })
        .where(eq(userSubscriptions.userId, userId));
    }
  }

  // Applications (public job applications)
  async createApplication(application: any) {
    const [newApp] = await db.insert(applications).values(application).returning();
    return newApp;
  }

  async getApplication(id: number) {
    const [app] = await db.select().from(applications).where(eq(applications.id, id));
    return app;
  }

  async listApplicationsByJob(jobId: number) {
    return db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobId))
      .orderBy(desc(applications.createdAt));
  }

  async getApplicationCountByJob(jobId: number) {
    const rows = await db
      .select({ count: count() })
      .from(applications)
      .where(eq(applications.jobId, jobId));
    return rows[0]?.count || 0;
  }

  async updateApplicationStatus(id: number, status: string) {
    const [updated] = await db
      .update(applications)
      .set({ status })
      .where(eq(applications.id, id))
      .returning();
    return updated;
  }

  async deleteApplication(id: number) {
    await db.delete(applications).where(eq(applications.id, id));
  }

  async listApplicationsByUser(userId: string) {
    const apps = await db
      .select({
        application: applications,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.createdAt));

    // Enrich with interview info for each application
    const enriched = await Promise.all(
      apps.map(async (row) => {
        const interviewRows = await db
          .select()
          .from(interviews)
          .where(eq(interviews.applicationId, row.application.id))
          .orderBy(desc(interviews.createdAt));

        return {
          ...row,
          interviewCount: interviewRows.length,
          latestInterviewStatus: interviewRows[0]?.status || null,
        };
      })
    );

    return enriched;
  }

  // Interviews (AI voice interviews)
  async createInterview(interview: any) {
    const [newInterview] = await db.insert(interviews).values(interview).returning();
    return newInterview;
  }

  async getInterview(id: number) {
    const [interview] = await db.select().from(interviews).where(eq(interviews.id, id));
    return interview;
  }

  async getInterviewBySessionId(sessionId: string) {
    const [interview] = await db.select().from(interviews).where(eq(interviews.sessionId, sessionId));
    return interview;
  }

  async listInterviewsByJob(jobId: number) {
    return db
      .select()
      .from(interviews)
      .where(eq(interviews.jobId, jobId))
      .orderBy(desc(interviews.createdAt));
  }

  async listInterviewsByUser(userId: string) {
    return db
      .select()
      .from(interviews)
      .where(eq(interviews.userId, userId))
      .orderBy(desc(interviews.createdAt));
  }

  async listInterviewsByApplicant(applicantUserId: string) {
    return db
      .select({
        interview: interviews,
        jobTitle: jobs.title,
        applicationId: applications.id,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(jobs, eq(interviews.jobId, jobs.id))
      .where(eq(applications.userId, applicantUserId))
      .orderBy(desc(interviews.createdAt));
  }

  async updateInterview(id: number, data: Partial<{
    status: string;
    conversation: any[];
    evaluation: Record<string, any>;
    overallScore: number;
    completedAt: Date;
  }>) {
    const [updated] = await db
      .update(interviews)
      .set(data)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  async deleteInterview(id: number) {
    await db.delete(interviews).where(eq(interviews.id, id));
  }

  // Public jobs (for job board)
  async listPublicJobs() {
    return db
      .select()
      .from(jobs)
      .where(and(eq(jobs.isPublic, true), eq(jobs.status, "open")))
      .orderBy(desc(jobs.createdAt));
  }

  async getPublicJob(id: number) {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, id), eq(jobs.isPublic, true), eq(jobs.status, "open")));
    return job;
  }

  // Public stats for landing page
  async getPublicStats() {
    const [acceptedResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(applications)
      .where(eq(applications.status, "accepted"));

    const [interviewsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(interviews)
      .where(eq(interviews.status, "completed"));

    const [jobsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(eq(jobs.isPublic, true));

    return {
      acceptedCount: acceptedResult?.count || 0,
      completedInterviews: interviewsResult?.count || 0,
      publicJobs: jobsResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
