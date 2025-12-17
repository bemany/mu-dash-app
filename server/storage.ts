import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  sessions,
  trips,
  transactions,
  uploads,
  type Session,
  type InsertSession,
  type Trip,
  type InsertTrip,
  type Transaction,
  type InsertTransaction,
  type Upload,
  type InsertUpload,
} from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export type OnProgressCallback = (processed: number, total: number) => void;

export interface IStorage {
  // Session management
  getOrCreateSession(sessionId: string): Promise<Session>;
  getSessionById(sessionId: string): Promise<Session | null>;
  updateSessionActivity(sessionId: string, currentStep: number): Promise<void>;
  getAllSessions(): Promise<Session[]>;
  getSessionByVorgangsId(vorgangsId: string): Promise<Session | null>;
  generateVorgangsId(sessionId: string): Promise<string>;
  clearVorgangsId(sessionId: string): Promise<void>;
  updateCompanyName(sessionId: string, companyName: string): Promise<void>;
  
  // Trip management
  createTrips(trips: InsertTrip[], onProgress?: OnProgressCallback): Promise<Trip[]>;
  getTripsBySession(sessionId: string): Promise<Trip[]>;
  getTripCountBySession(sessionId: string): Promise<number>;
  deleteTripsForSession(sessionId: string): Promise<void>;
  
  // Transaction management
  createTransactions(transactions: InsertTransaction[], onProgress?: OnProgressCallback): Promise<Transaction[]>;
  getTransactionsBySession(sessionId: string): Promise<Transaction[]>;
  getTransactionCountBySession(sessionId: string): Promise<number>;
  deleteTransactionsForSession(sessionId: string): Promise<void>;
  
  // Session data cleanup
  deleteSession(sessionId: string): Promise<void>;
  
  // Upload management
  createUpload(upload: InsertUpload): Promise<Upload>;
  getUploadsBySession(sessionId: string): Promise<Upload[]>;
  getUploadById(uploadId: string): Promise<Upload | null>;
  deleteUploadsForSession(sessionId: string): Promise<void>;
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

  async getSessionById(sessionId: string): Promise<Session | null> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
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

  async getSessionByVorgangsId(vorgangsId: string): Promise<Session | null> {
    const result = await db
      .select()
      .from(sessions)
      .where(eq(sessions.vorgangsId, vorgangsId.toUpperCase()))
      .limit(1);
    
    return result.length > 0 ? result[0] : null;
  }

  async generateVorgangsId(sessionId: string): Promise<string> {
    const existing = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionId, sessionId))
      .limit(1);
    
    if (existing.length > 0 && existing[0].vorgangsId) {
      return existing[0].vorgangsId;
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let vorgangsId: string;
    let isUnique = false;
    
    while (!isUnique) {
      vorgangsId = '';
      for (let i = 0; i < 6; i++) {
        vorgangsId += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const check = await db
        .select()
        .from(sessions)
        .where(eq(sessions.vorgangsId, vorgangsId))
        .limit(1);
      
      isUnique = check.length === 0;
    }

    await db
      .update(sessions)
      .set({ vorgangsId: vorgangsId! })
      .where(eq(sessions.sessionId, sessionId));
    
    return vorgangsId!;
  }

  async clearVorgangsId(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({ vorgangsId: null })
      .where(eq(sessions.sessionId, sessionId));
  }

  async updateCompanyName(sessionId: string, companyName: string): Promise<void> {
    await db
      .update(sessions)
      .set({ companyName })
      .where(eq(sessions.sessionId, sessionId));
  }

  async createTrips(newTrips: InsertTrip[], onProgress?: OnProgressCallback): Promise<Trip[]> {
    if (newTrips.length === 0) return [];
    
    const BATCH_SIZE = 500;
    const results: Trip[] = [];
    const total = newTrips.length;
    
    for (let i = 0; i < newTrips.length; i += BATCH_SIZE) {
      const batch = newTrips.slice(i, i + BATCH_SIZE);
      const inserted = await db.insert(trips).values(batch).returning();
      results.push(...inserted);
      
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, total), total);
      }
    }
    
    return results;
  }

  async getTripsBySession(sessionId: string): Promise<Trip[]> {
    return await db
      .select()
      .from(trips)
      .where(eq(trips.sessionId, sessionId));
  }

  async getTripCountBySession(sessionId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(trips)
      .where(eq(trips.sessionId, sessionId));
    return result[0]?.count || 0;
  }

  async deleteTripsForSession(sessionId: string): Promise<void> {
    await db.delete(trips).where(eq(trips.sessionId, sessionId));
  }

  async createTransactions(newTransactions: InsertTransaction[], onProgress?: OnProgressCallback): Promise<Transaction[]> {
    if (newTransactions.length === 0) return [];
    
    const BATCH_SIZE = 500;
    const results: Transaction[] = [];
    const total = newTransactions.length;
    
    for (let i = 0; i < newTransactions.length; i += BATCH_SIZE) {
      const batch = newTransactions.slice(i, i + BATCH_SIZE);
      const inserted = await db.insert(transactions).values(batch).returning();
      results.push(...inserted);
      
      if (onProgress) {
        onProgress(Math.min(i + BATCH_SIZE, total), total);
      }
    }
    
    return results;
  }

  async getTransactionsBySession(sessionId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.sessionId, sessionId));
  }

  async getTransactionCountBySession(sessionId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.sessionId, sessionId));
    return result[0]?.count || 0;
  }

  async deleteTransactionsForSession(sessionId: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.sessionId, sessionId));
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Delete all related data
    await this.deleteTripsForSession(sessionId);
    await this.deleteTransactionsForSession(sessionId);
    await this.deleteUploadsForSession(sessionId);
    await db.delete(sessions).where(eq(sessions.sessionId, sessionId));
  }

  async createUpload(upload: InsertUpload): Promise<Upload> {
    const result = await db.insert(uploads).values(upload).returning();
    return result[0];
  }

  async getUploadsBySession(sessionId: string): Promise<Upload[]> {
    return await db
      .select()
      .from(uploads)
      .where(eq(uploads.sessionId, sessionId));
  }

  async getUploadById(uploadId: string): Promise<Upload | null> {
    const result = await db
      .select()
      .from(uploads)
      .where(eq(uploads.id, uploadId))
      .limit(1);
    return result.length > 0 ? result[0] : null;
  }

  async deleteUploadsForSession(sessionId: string): Promise<void> {
    await db.delete(uploads).where(eq(uploads.sessionId, sessionId));
  }
}

export const storage = new DatabaseStorage();
