import { candidates, userSubscriptions, users, type InsertCandidate, type UserSubscription, type User } from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc } from "drizzle-orm";

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

  async createUser(email: string, passwordHash: string, firstName?: string, lastName?: string): Promise<User> {
    const [user] = await db.insert(users).values({
      email,
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
    }).returning();
    return user;
  }

  // Candidates
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
}

export const storage = new DatabaseStorage();
