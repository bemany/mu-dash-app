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

export interface PerformanceMetrics {
  totals: {
    revenue: number;
    distance: number;
    hoursWorked: number;
    tripCount: number;
  };
  byDriver: Array<{
    driverName: string;
    revenue: number;
    distance: number;
    hoursWorked: number;
    tripCount: number;
  }>;
  byVehicle: Array<{
    licensePlate: string;
    revenue: number;
    distance: number;
    hoursWorked: number;
    tripCount: number;
  }>;
  byDay: Array<{
    date: string;
    revenue: number;
    distance: number;
    hoursWorked: number;
    tripCount: number;
  }>;
  byMonth: Array<{
    month: string;
    revenue: number;
    distance: number;
    hoursWorked: number;
    tripCount: number;
  }>;
}

export interface ShiftData {
  driverName: string;
  licensePlate: string;
  shiftStart: Date;
  shiftEnd: Date;
  shiftType: 'day' | 'night';
  revenue: number;
  distance: number;
  hoursWorked: number;
  tripCount: number;
}

export interface ShiftAnalysis {
  shifts: ShiftData[];
  summary: {
    totalShifts: number;
    dayShifts: number;
    nightShifts: number;
    avgShiftDuration: number;
    avgRevenuePerShift: number;
  };
}

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
  getAggregatedTripsBySession(sessionId: string): Promise<{ licensePlate: string; month: string; count: number }[]>;
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
  
  // Performance metrics
  getPerformanceMetrics(sessionId: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetrics>;
  getShiftAnalysis(sessionId: string, startDate?: Date, endDate?: Date): Promise<ShiftAnalysis>;
  getDataDateRange(sessionId: string): Promise<{ minDate: Date | null; maxDate: Date | null; availableMonths: string[] }>;
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

  async getAggregatedTripsBySession(sessionId: string): Promise<{ licensePlate: string; month: string; count: number }[]> {
    const result = await db.execute(sql`
      SELECT 
        license_plate as "licensePlate",
        TO_CHAR(order_time, 'YYYY-MM') as month,
        COUNT(*)::int as count
      FROM trips
      WHERE session_id = ${sessionId}
      GROUP BY license_plate, TO_CHAR(order_time, 'YYYY-MM')
      ORDER BY license_plate, month
    `);
    return result.rows as { licensePlate: string; month: string; count: number }[];
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

  async getPerformanceMetrics(sessionId: string, startDate?: Date, endDate?: Date): Promise<PerformanceMetrics> {
    const dateFilter = this.buildDateFilter(startDate, endDate);
    
    const [totalsResult, byDriverResult, byVehicleResult, byDayResult, byMonthResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          COALESCE(SUM(amount), 0)::bigint as revenue,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as distance,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Startzeit der Fahrt' IS NOT NULL 
                AND raw_data->>'Ankunftszeit der Fahrt' IS NOT NULL
              THEN EXTRACT(EPOCH FROM (
                CASE 
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM transactions
        WHERE session_id = ${sessionId}
        ${dateFilter}
      `),
      
      db.execute(sql`
        SELECT 
          CONCAT(
            COALESCE(raw_data->>'Vorname des Fahrers', ''),
            ' ',
            COALESCE(raw_data->>'Nachname des Fahrers', '')
          ) as driver_name,
          COALESCE(SUM(amount), 0)::bigint as revenue,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as distance,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Startzeit der Fahrt' IS NOT NULL 
                AND raw_data->>'Ankunftszeit der Fahrt' IS NOT NULL
              THEN EXTRACT(EPOCH FROM (
                CASE 
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM transactions
        WHERE session_id = ${sessionId}
        ${dateFilter}
        GROUP BY driver_name
        HAVING TRIM(CONCAT(
          COALESCE(raw_data->>'Vorname des Fahrers', ''),
          ' ',
          COALESCE(raw_data->>'Nachname des Fahrers', '')
        )) != ''
        ORDER BY revenue DESC
      `),
      
      db.execute(sql`
        SELECT 
          license_plate,
          COALESCE(SUM(amount), 0)::bigint as revenue,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as distance,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Startzeit der Fahrt' IS NOT NULL 
                AND raw_data->>'Ankunftszeit der Fahrt' IS NOT NULL
              THEN EXTRACT(EPOCH FROM (
                CASE 
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM transactions
        WHERE session_id = ${sessionId}
        ${dateFilter}
        GROUP BY license_plate
        ORDER BY revenue DESC
      `),
      
      db.execute(sql`
        SELECT 
          TO_CHAR(transaction_time, 'YYYY-MM-DD') as date,
          COALESCE(SUM(amount), 0)::bigint as revenue,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as distance,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Startzeit der Fahrt' IS NOT NULL 
                AND raw_data->>'Ankunftszeit der Fahrt' IS NOT NULL
              THEN EXTRACT(EPOCH FROM (
                CASE 
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM transactions
        WHERE session_id = ${sessionId}
        ${dateFilter}
        GROUP BY date
        ORDER BY date
      `),
      
      db.execute(sql`
        SELECT 
          TO_CHAR(transaction_time, 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0)::bigint as revenue,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as distance,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Startzeit der Fahrt' IS NOT NULL 
                AND raw_data->>'Ankunftszeit der Fahrt' IS NOT NULL
              THEN EXTRACT(EPOCH FROM (
                CASE 
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\d{4}-\d{2}-\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM transactions
        WHERE session_id = ${sessionId}
        ${dateFilter}
        GROUP BY month
        ORDER BY month
      `),
    ]);

    const totalsRow = totalsResult.rows[0] as any;
    
    return {
      totals: {
        revenue: Number(totalsRow?.revenue || 0),
        distance: Number(totalsRow?.distance || 0),
        hoursWorked: Number(totalsRow?.hours_worked || 0),
        tripCount: Number(totalsRow?.trip_count || 0),
      },
      byDriver: (byDriverResult.rows as any[]).map(row => ({
        driverName: row.driver_name?.trim() || 'Unbekannt',
        revenue: Number(row.revenue || 0),
        distance: Number(row.distance || 0),
        hoursWorked: Number(row.hours_worked || 0),
        tripCount: Number(row.trip_count || 0),
      })),
      byVehicle: (byVehicleResult.rows as any[]).map(row => ({
        licensePlate: row.license_plate || 'Unbekannt',
        revenue: Number(row.revenue || 0),
        distance: Number(row.distance || 0),
        hoursWorked: Number(row.hours_worked || 0),
        tripCount: Number(row.trip_count || 0),
      })),
      byDay: (byDayResult.rows as any[]).map(row => ({
        date: row.date,
        revenue: Number(row.revenue || 0),
        distance: Number(row.distance || 0),
        hoursWorked: Number(row.hours_worked || 0),
        tripCount: Number(row.trip_count || 0),
      })),
      byMonth: (byMonthResult.rows as any[]).map(row => ({
        month: row.month,
        revenue: Number(row.revenue || 0),
        distance: Number(row.distance || 0),
        hoursWorked: Number(row.hours_worked || 0),
        tripCount: Number(row.trip_count || 0),
      })),
    };
  }

  private buildDateFilter(startDate?: Date, endDate?: Date): ReturnType<typeof sql> {
    if (startDate && endDate) {
      return sql`AND transaction_time >= ${startDate} AND transaction_time <= ${endDate}`;
    } else if (startDate) {
      return sql`AND transaction_time >= ${startDate}`;
    } else if (endDate) {
      return sql`AND transaction_time <= ${endDate}`;
    }
    return sql``;
  }

  async getShiftAnalysis(sessionId: string, startDate?: Date, endDate?: Date): Promise<ShiftAnalysis> {
    let dateCondition = '';
    const params: any[] = [sessionId];
    
    if (startDate) {
      params.push(startDate);
      dateCondition += ` AND transaction_time >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateCondition += ` AND transaction_time <= $${params.length}`;
    }

    const tripsQuery = `
      SELECT 
        id,
        license_plate,
        transaction_time,
        amount,
        raw_data->>'Vorname des Fahrers' as first_name,
        raw_data->>'Nachname des Fahrers' as last_name,
        CASE 
          WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
          THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
          ELSE 0
        END as distance,
        raw_data->>'Startzeit der Fahrt' as start_time,
        raw_data->>'Ankunftszeit der Fahrt' as end_time
      FROM transactions
      WHERE session_id = $1
      ${dateCondition}
      ORDER BY 
        CONCAT(raw_data->>'Vorname des Fahrers', ' ', raw_data->>'Nachname des Fahrers'),
        license_plate,
        transaction_time
    `;

    const result = await pool.query(tripsQuery, params);
    const tripRows = result.rows;

    if (tripRows.length === 0) {
      return {
        shifts: [],
        summary: {
          totalShifts: 0,
          dayShifts: 0,
          nightShifts: 0,
          avgShiftDuration: 0,
          avgRevenuePerShift: 0,
        },
      };
    }

    const SHIFT_GAP_HOURS = 5;
    const shifts: ShiftData[] = [];
    
    let currentShift: {
      driverName: string;
      licensePlate: string;
      trips: Array<{
        time: Date;
        amount: number;
        distance: number;
        startTime?: Date;
        endTime?: Date;
      }>;
    } | null = null;

    for (const trip of tripRows) {
      const driverName = `${trip.first_name || ''} ${trip.last_name || ''}`.trim() || 'Unbekannt';
      const licensePlate = trip.license_plate || 'Unbekannt';
      const tripTime = new Date(trip.transaction_time);
      const amount = Number(trip.amount) || 0;
      const distance = Number(trip.distance) || 0;
      
      let startTime: Date | undefined;
      let endTime: Date | undefined;
      
      if (trip.start_time) {
        try {
          startTime = new Date(trip.start_time.replace(/ \+\d{4} [A-Z]+$/, ''));
          if (isNaN(startTime.getTime())) startTime = undefined;
        } catch { startTime = undefined; }
      }
      if (trip.end_time) {
        try {
          endTime = new Date(trip.end_time.replace(/ \+\d{4} [A-Z]+$/, ''));
          if (isNaN(endTime.getTime())) endTime = undefined;
        } catch { endTime = undefined; }
      }

      const tripData = { time: tripTime, amount, distance, startTime, endTime };

      if (!currentShift || 
          currentShift.driverName !== driverName || 
          currentShift.licensePlate !== licensePlate) {
        if (currentShift && currentShift.trips.length > 0) {
          shifts.push(this.buildShift(currentShift));
        }
        currentShift = { driverName, licensePlate, trips: [tripData] };
      } else {
        const lastTrip = currentShift.trips[currentShift.trips.length - 1];
        const gapHours = (tripTime.getTime() - lastTrip.time.getTime()) / (1000 * 60 * 60);
        
        if (gapHours > SHIFT_GAP_HOURS) {
          shifts.push(this.buildShift(currentShift));
          currentShift = { driverName, licensePlate, trips: [tripData] };
        } else {
          currentShift.trips.push(tripData);
        }
      }
    }

    if (currentShift && currentShift.trips.length > 0) {
      shifts.push(this.buildShift(currentShift));
    }

    const dayShifts = shifts.filter(s => s.shiftType === 'day').length;
    const nightShifts = shifts.filter(s => s.shiftType === 'night').length;
    const totalHours = shifts.reduce((sum, s) => sum + s.hoursWorked, 0);
    const totalRevenue = shifts.reduce((sum, s) => sum + s.revenue, 0);

    return {
      shifts,
      summary: {
        totalShifts: shifts.length,
        dayShifts,
        nightShifts,
        avgShiftDuration: shifts.length > 0 ? totalHours / shifts.length : 0,
        avgRevenuePerShift: shifts.length > 0 ? totalRevenue / shifts.length : 0,
      },
    };
  }

  private buildShift(shiftData: {
    driverName: string;
    licensePlate: string;
    trips: Array<{
      time: Date;
      amount: number;
      distance: number;
      startTime?: Date;
      endTime?: Date;
    }>;
  }): ShiftData {
    const trips = shiftData.trips;
    const shiftStart = trips[0].time;
    const shiftEnd = trips[trips.length - 1].time;
    
    const revenue = trips.reduce((sum, t) => sum + t.amount, 0);
    const distance = trips.reduce((sum, t) => sum + t.distance, 0);
    
    let hoursWorked = 0;
    for (const trip of trips) {
      if (trip.startTime && trip.endTime) {
        hoursWorked += (trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60 * 60);
      }
    }
    if (hoursWorked === 0) {
      hoursWorked = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);
    }

    let dayMinutes = 0;
    let nightMinutes = 0;
    
    for (const trip of trips) {
      let tripDurationMinutes = 15;
      if (trip.startTime && trip.endTime) {
        tripDurationMinutes = Math.max(1, (trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60));
      }
      
      const tripHour = trip.time.getHours();
      if (tripHour >= 6 && tripHour < 18) {
        dayMinutes += tripDurationMinutes;
      } else {
        nightMinutes += tripDurationMinutes;
      }
    }

    const shiftType: 'day' | 'night' = dayMinutes >= nightMinutes ? 'day' : 'night';

    return {
      driverName: shiftData.driverName,
      licensePlate: shiftData.licensePlate,
      shiftStart,
      shiftEnd,
      shiftType,
      revenue,
      distance,
      hoursWorked,
      tripCount: trips.length,
    };
  }

  async getDataDateRange(sessionId: string): Promise<{ minDate: Date | null; maxDate: Date | null; availableMonths: string[] }> {
    const result = await db.execute(sql`
      SELECT 
        MIN(transaction_time) as min_date,
        MAX(transaction_time) as max_date
      FROM transactions
      WHERE session_id = ${sessionId}
    `);

    const monthsResult = await db.execute(sql`
      SELECT DISTINCT TO_CHAR(transaction_time, 'YYYY-MM') as month
      FROM transactions
      WHERE session_id = ${sessionId}
      ORDER BY month
    `);

    const row = (result.rows as any[])[0];
    return {
      minDate: row?.min_date ? new Date(row.min_date) : null,
      maxDate: row?.max_date ? new Date(row.max_date) : null,
      availableMonths: (monthsResult.rows as any[]).map(r => r.month).filter(Boolean),
    };
  }
}

export const storage = new DatabaseStorage();
