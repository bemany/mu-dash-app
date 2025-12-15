import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  sessions,
  trips,
  transactions,
  type Session,
  type InsertSession,
  type Trip,
  type InsertTrip,
  type Transaction,
  type InsertTransaction,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  // Session management
  getOrCreateSession(sessionId: string): Promise<Session>;
  updateSessionActivity(sessionId: string, currentStep: number): Promise<void>;
  getAllSessions(): Promise<Session[]>;
  
  // Trip management
  createTrips(trips: InsertTrip[]): Promise<Trip[]>;
  getTripsBySession(sessionId: string): Promise<Trip[]>;
  deleteTripsForSession(sessionId: string): Promise<void>;
  
  // Transaction management
  createTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
  getTransactionsBySession(sessionId: string): Promise<Transaction[]>;
  deleteTransactionsForSession(sessionId: string): Promise<void>;
  
  // Session data cleanup
  deleteSession(sessionId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getOrCreateSession(sessionId: string): Promise<Session> {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const newSession = await db
      .insert(sessions)
      .values({ sessionId })
      .returning();

    return newSession[0];
  }

  async updateSessionActivity(sessionId: string, currentStep: number): Promise<void> {
    await db
      .update(sessions)
      .set({ 
        lastActivityAt: new Date(),
        currentStep,
      })
      .where(eq(sessions.sessionId, sessionId));
  }

  async getAllSessions(): Promise<Session[]> {
    return await db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.lastActivityAt));
  }

  async createTrips(newTrips: InsertTrip[]): Promise<Trip[]> {
    if (newTrips.length === 0) return [];
    return await db.insert(trips).values(newTrips).returning();
  }

  async getTripsBySession(sessionId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.sessionId, sessionId));
  }

  async deleteTripsForSession(sessionId: string): Promise<void> {
    await db.delete(trips).where(eq(trips.sessionId, sessionId));
  }

  async createTransactions(newTransactions: InsertTransaction[]): Promise<Transaction[]> {
    if (newTransactions.length === 0) return [];
    return await db.insert(transactions).values(newTransactions).returning();
  }

  async getTransactionsBySession(sessionId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.sessionId, sessionId));
  }

  async deleteTransactionsForSession(sessionId: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.sessionId, sessionId));
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Delete all related data
    await this.deleteTripsForSession(sessionId);
    await this.deleteTransactionsForSession(sessionId);
    await db.delete(sessions).where(eq(sessions.sessionId, sessionId));
  }
}

export const storage = new DatabaseStorage();
