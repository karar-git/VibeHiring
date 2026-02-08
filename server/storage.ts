import { candidates, userSubscriptions, type InsertCandidate, type UserSubscription } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Candidates
  createCandidate(candidate: InsertCandidate): Promise<typeof candidates.$inferSelect>;
  getCandidate(id: number): Promise<typeof candidates.$inferSelect | undefined>;
  listCandidates(userId: string): Promise<(typeof candidates.$inferSelect)[]>;
  deleteCandidate(id: number): Promise<void>;

  // Subscriptions
  getSubscription(userId: string): Promise<UserSubscription | undefined>;
  createSubscription(userId: string): Promise<UserSubscription>;
  updateSubscription(userId: string, plan: string): Promise<UserSubscription>;
  incrementCvCount(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createCandidate(candidate: InsertCandidate) {
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
      .orderBy(desc(candidates.score)); // Rank by score
  }

  async deleteCandidate(id: number) {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

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
}

export const storage = new DatabaseStorage();
