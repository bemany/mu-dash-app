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

export interface DriverReportRow {
  firstName: string;
  lastName: string;
  completedTrips: number;
  cancelledTrips: number;
  totalTrips: number;
  avgFarePerTrip: number;
  distanceInTrip: number;
  pricePerKm: number;
  revenuePerDay: number;
  revenuePerHour: number;
  tripsPerHour: number;
  acceptanceRate: number;
  timeInTrip: number;
  shiftCount: number;
  dayShiftCount: number;
  nightShiftCount: number;
}

export interface DriverReportSummary {
  totalRevenue: number;
  totalDistance: number;
  totalHoursWorked: number;
  totalTrips: number;
  totalShifts: number;
  uniqueDrivers: number;
  avgRevenuePerHour: number;
  avgRevenuePerDay: number;
  avgRevenuePerMonth: number;
  avgRevenuePerKm: number;
  avgRevenuePerTrip: number;
  avgRevenuePerDriver: number;
}

export interface VehicleReportRow {
  licensePlate: string;
  completedTrips: number;
  cancelledTrips: number;
  totalTrips: number;
  avgFarePerTrip: number;
  distanceInTrip: number;
  pricePerKm: number;
  revenuePerDay: number;
  revenueNightShift: number;
  revenueDayShift: number;
  totalRevenue: number;
  revenuePerHour: number;
  tripsPerHour: number;
  acceptanceRate: number;
  timeInTrip: number;
  shiftCount: number;
  dayShiftCount: number;
  nightShiftCount: number;
  occupancyRate: number;
}

export interface VehicleReportSummary {
  totalRevenue: number;
  totalDistance: number;
  totalHoursWorked: number;
  totalTrips: number;
  totalShifts: number;
  uniqueVehicles: number;
  avgRevenuePerHour: number;
  avgRevenuePerDay: number;
  avgRevenuePerMonth: number;
  avgRevenuePerKm: number;
  avgRevenuePerTrip: number;
  avgRevenuePerVehicle: number;
  avgOccupancyRate: number;
}

export interface PromoReportRow {
  licensePlate: string;
  month: string;
  tripCount: number;
  theoreticalBonus: number;
  actualPaid: number;
  difference: number;
}

export interface PromoReportSummary {
  totalTheoreticalBonus: number;
  totalActualPaid: number;
  totalDifference: number;
  totalTrips: number;
  licensePlateCount: number;
  monthCount: number;
}

export interface CommissionAnalysis {
  summary: {
    totalFarePrice: number; // Total fare price in cents
    totalRevenue: number; // Your revenue in cents  
    totalCommission: number; // Commission taken (farePrice - revenue) in cents
    commissionPercent: number; // Average commission percentage
    tripCount: number; // Number of trips with commission data
  };
  byDriver: Array<{
    driverName: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
  byVehicle: Array<{
    licensePlate: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
  byMonth: Array<{
    month: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
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
  
  // Driver report
  getDriverReport(sessionId: string, startDate?: Date, endDate?: Date): Promise<{summary: DriverReportSummary, drivers: DriverReportRow[]}>;
  
  // Vehicle report
  getVehicleReport(sessionId: string, startDate?: Date, endDate?: Date): Promise<{summary: VehicleReportSummary, vehicles: VehicleReportRow[]}>;
  
  // Promo/Bonus report
  getPromoReport(sessionId: string): Promise<{summary: PromoReportSummary, rows: PromoReportRow[]}>;
  
  // Commission analysis
  getCommissionAnalysis(sessionId: string, startDate?: Date, endDate?: Date): Promise<CommissionAnalysis>;
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
    const dateFilter = this.buildTripDateFilter(startDate, endDate);
    
    const [totalsResult, byDriverResult, byVehicleResult, byDayResult, byMonthResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as revenue,
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
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM trips
        WHERE session_id = ${sessionId}
        ${dateFilter}
      `),
      
      db.execute(sql`
        SELECT 
          TRIM(CONCAT(
            COALESCE(raw_data->>'Vorname des Fahrers', ''),
            ' ',
            COALESCE(raw_data->>'Nachname des Fahrers', '')
          )) as driver_name,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as revenue,
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
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM trips
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
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as revenue,
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
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM trips
        WHERE session_id = ${sessionId}
        ${dateFilter}
        GROUP BY license_plate
        ORDER BY revenue DESC
      `),
      
      db.execute(sql`
        SELECT 
          TO_CHAR(order_time, 'YYYY-MM-DD') as date,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as revenue,
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
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM trips
        WHERE session_id = ${sessionId}
        ${dateFilter}
        GROUP BY date
        ORDER BY date
      `),
      
      db.execute(sql`
        SELECT 
          TO_CHAR(order_time, 'YYYY-MM') as month,
          COALESCE(SUM(
            CASE 
              WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
              THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric * 100
              ELSE 0
            END
          ), 0)::bigint as revenue,
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
                  WHEN raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Ankunftszeit der Fahrt')::timestamp
                  ELSE NULL
                END - 
                CASE 
                  WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
                  THEN (raw_data->>'Startzeit der Fahrt')::timestamp
                  ELSE NULL
                END
              )) / 3600
              ELSE 0
            END
          ), 0)::numeric as hours_worked,
          COUNT(*)::int as trip_count
        FROM trips
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

  private buildTripDateFilter(startDate?: Date, endDate?: Date): ReturnType<typeof sql> {
    if (startDate && endDate) {
      return sql`AND order_time >= ${startDate} AND order_time <= ${endDate}`;
    } else if (startDate) {
      return sql`AND order_time >= ${startDate}`;
    } else if (endDate) {
      return sql`AND order_time <= ${endDate}`;
    }
    return sql``;
  }

  async getShiftAnalysis(sessionId: string, startDate?: Date, endDate?: Date): Promise<ShiftAnalysis> {
    let dateCondition = '';
    const params: any[] = [sessionId];
    
    if (startDate) {
      params.push(startDate);
      dateCondition += ` AND order_time >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      dateCondition += ` AND order_time <= $${params.length}`;
    }

    const tripsQuery = `
      SELECT 
        id,
        license_plate,
        order_time,
        CASE 
          WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
          THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric * 100
          ELSE 0
        END as revenue,
        raw_data->>'Vorname des Fahrers' as first_name,
        raw_data->>'Nachname des Fahrers' as last_name,
        CASE 
          WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
          THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric * 100
          ELSE 0
        END as distance,
        raw_data->>'Startzeit der Fahrt' as start_time,
        raw_data->>'Ankunftszeit der Fahrt' as end_time
      FROM trips
      WHERE session_id = $1
      ${dateCondition}
      ORDER BY 
        CONCAT(raw_data->>'Vorname des Fahrers', ' ', raw_data->>'Nachname des Fahrers'),
        license_plate,
        order_time
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
        revenue: number;
        distance: number;
        startTime?: Date;
        endTime?: Date;
      }>;
    } | null = null;

    for (const trip of tripRows) {
      const driverName = `${trip.first_name || ''} ${trip.last_name || ''}`.trim() || 'Unbekannt';
      const licensePlate = trip.license_plate || 'Unbekannt';
      const tripTime = new Date(trip.order_time);
      const revenue = Number(trip.revenue) || 0;
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

      const tripData = { time: tripTime, revenue, distance, startTime, endTime };

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
      revenue: number;
      distance: number;
      startTime?: Date;
      endTime?: Date;
    }>;
  }): ShiftData {
    const trips = shiftData.trips;
    const shiftStart = trips[0].time;
    const shiftEnd = trips[trips.length - 1].time;
    
    const revenue = trips.reduce((sum, t) => sum + t.revenue, 0);
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

  async getDriverReport(sessionId: string, startDate?: Date, endDate?: Date): Promise<{summary: DriverReportSummary, drivers: DriverReportRow[]}> {
    const dateFilter = this.buildTripDateFilter(startDate, endDate);
    
    const result = await db.execute(sql`
      WITH trip_data AS (
        SELECT 
          COALESCE(raw_data->>'Vorname des Fahrers', '') as first_name,
          COALESCE(raw_data->>'Nachname des Fahrers', '') as last_name,
          order_time,
          LOWER(COALESCE(trip_status, '')) as status,
          CASE 
            WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
            THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric
            ELSE 0
          END as fare,
          CASE 
            WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
            THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric
            ELSE 0
          END as distance_m,
          CASE 
            WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
              AND raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
            THEN GREATEST(0, EXTRACT(EPOCH FROM (
              (raw_data->>'Ankunftszeit der Fahrt')::timestamp - 
              (raw_data->>'Startzeit der Fahrt')::timestamp
            )) / 3600)
            ELSE 0
          END as trip_hours,
          CASE 
            WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
            THEN EXTRACT(HOUR FROM (raw_data->>'Startzeit der Fahrt')::timestamp)
            ELSE EXTRACT(HOUR FROM order_time)
          END as start_hour
        FROM trips
        WHERE session_id = ${sessionId}
        ${dateFilter}
      ),
      trip_with_shift_type AS (
        SELECT 
          *,
          CASE 
            WHEN start_hour >= 6 AND start_hour < 18 THEN 'day'
            ELSE 'night'
          END as shift_type
        FROM trip_data
        WHERE TRIM(first_name) != '' OR TRIM(last_name) != ''
      ),
      shift_detection AS (
        SELECT 
          first_name,
          last_name,
          order_time,
          status,
          fare,
          distance_m,
          trip_hours,
          shift_type,
          CASE 
            WHEN LAG(order_time) OVER (
              PARTITION BY first_name, last_name 
              ORDER BY order_time
            ) IS NULL 
            OR EXTRACT(EPOCH FROM (order_time - LAG(order_time) OVER (
              PARTITION BY first_name, last_name 
              ORDER BY order_time
            ))) / 3600 > 5
            THEN 1
            ELSE 0
          END as is_new_shift
        FROM trip_with_shift_type
      ),
      driver_metrics AS (
        SELECT 
          first_name,
          last_name,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
          COUNT(*) FILTER (WHERE status IN ('driver_cancelled', 'rider_cancelled', 'failed', 'delivery_failed')) as cancelled_trips,
          COUNT(*) as total_trips,
          SUM(CASE WHEN status = 'completed' THEN fare ELSE 0 END) as total_fare,
          SUM(distance_m) as total_distance_m,
          SUM(trip_hours) as total_hours,
          SUM(is_new_shift) as shift_count,
          SUM(CASE WHEN is_new_shift = 1 AND shift_type = 'day' THEN 1 ELSE 0 END) as day_shift_count,
          SUM(CASE WHEN is_new_shift = 1 AND shift_type = 'night' THEN 1 ELSE 0 END) as night_shift_count,
          COUNT(DISTINCT DATE(order_time)) as active_days,
          COUNT(DISTINCT TO_CHAR(order_time, 'YYYY-MM')) as active_months
        FROM shift_detection
        GROUP BY first_name, last_name
      )
      SELECT 
        first_name,
        last_name,
        completed_trips,
        cancelled_trips,
        total_trips,
        CASE WHEN completed_trips > 0 THEN total_fare / completed_trips ELSE 0 END as avg_fare_per_trip,
        total_distance_m as distance_in_trip,
        CASE WHEN total_distance_m > 0 THEN total_fare / total_distance_m ELSE 0 END as price_per_km,
        CASE WHEN active_days > 0 THEN total_fare / active_days ELSE 0 END as revenue_per_day,
        CASE WHEN total_hours > 0 THEN total_fare / total_hours ELSE 0 END as revenue_per_hour,
        CASE WHEN total_hours > 0 THEN completed_trips::numeric / total_hours ELSE 0 END as trips_per_hour,
        CASE WHEN total_trips > 0 
          THEN (completed_trips::numeric / total_trips) * 100 
          ELSE 0 
        END as acceptance_rate,
        total_hours as time_in_trip,
        shift_count,
        day_shift_count,
        night_shift_count,
        active_days,
        active_months
      FROM driver_metrics
      ORDER BY total_fare DESC
    `);

    if (result.rows.length > 0) {
      console.log('[DEBUG] First driver row keys:', Object.keys(result.rows[0]));
      console.log('[DEBUG] First driver row time_in_trip:', (result.rows[0] as any).time_in_trip);
    }

    const drivers: DriverReportRow[] = (result.rows as any[]).map(row => ({
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      completedTrips: Number(row.completed_trips) || 0,
      cancelledTrips: Number(row.cancelled_trips) || 0,
      totalTrips: Number(row.total_trips) || 0,
      avgFarePerTrip: Number(row.avg_fare_per_trip) || 0,
      distanceInTrip: Number(row.distance_in_trip) || 0,
      pricePerKm: Number(row.price_per_km) || 0,
      revenuePerDay: Number(row.revenue_per_day) || 0,
      revenuePerHour: Number(row.revenue_per_hour) || 0,
      tripsPerHour: Number(row.trips_per_hour) || 0,
      acceptanceRate: Number(row.acceptance_rate) || 0,
      timeInTrip: Number(row.time_in_trip) || 0,
      shiftCount: Number(row.shift_count) || 0,
      dayShiftCount: Number(row.day_shift_count) || 0,
      nightShiftCount: Number(row.night_shift_count) || 0,
    }));

    const totalRevenue = drivers.reduce((sum, d) => sum + d.avgFarePerTrip * d.completedTrips, 0);
    const totalDistance = drivers.reduce((sum, d) => sum + d.distanceInTrip, 0);
    const totalHoursWorked = drivers.reduce((sum, d) => sum + d.timeInTrip, 0);
    const totalTrips = drivers.reduce((sum, d) => sum + d.completedTrips, 0);
    const totalShifts = drivers.reduce((sum, d) => sum + d.shiftCount, 0);
    const uniqueDrivers = drivers.length;

    const totalActiveDays = (result.rows as any[]).reduce((sum: number, row: any) => sum + (Number(row.active_days) || 0), 0);
    const totalActiveMonths = (result.rows as any[]).reduce((sum: number, row: any) => sum + (Number(row.active_months) || 0), 0);

    const summary: DriverReportSummary = {
      totalRevenue,
      totalDistance,
      totalHoursWorked,
      totalTrips,
      totalShifts,
      uniqueDrivers,
      avgRevenuePerHour: totalHoursWorked > 0 ? totalRevenue / totalHoursWorked : 0,
      avgRevenuePerDay: totalActiveDays > 0 ? totalRevenue / totalActiveDays : 0,
      avgRevenuePerMonth: totalActiveMonths > 0 ? totalRevenue / totalActiveMonths : 0,
      avgRevenuePerKm: totalDistance > 0 ? totalRevenue / totalDistance : 0,
      avgRevenuePerTrip: totalTrips > 0 ? totalRevenue / totalTrips : 0,
      avgRevenuePerDriver: uniqueDrivers > 0 ? totalRevenue / uniqueDrivers : 0,
    };

    return { summary, drivers };
  }

  async getVehicleReport(sessionId: string, startDate?: Date, endDate?: Date): Promise<{summary: VehicleReportSummary, vehicles: VehicleReportRow[]}> {
    const dateFilter = this.buildTripDateFilter(startDate, endDate);
    
    const result = await db.execute(sql`
      WITH trip_data AS (
        SELECT 
          license_plate,
          order_time,
          LOWER(COALESCE(trip_status, '')) as status,
          CASE 
            WHEN raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)' ~ '^[0-9]+([,.][0-9]+)?$'
            THEN REPLACE(raw_data->>'Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)', ',', '.')::numeric
            ELSE 0
          END as fare,
          CASE 
            WHEN raw_data->>'Fahrtdistanz' ~ '^[0-9]+([,.][0-9]+)?$'
            THEN REPLACE(raw_data->>'Fahrtdistanz', ',', '.')::numeric
            ELSE 0
          END as distance_m,
          CASE 
            WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
              AND raw_data->>'Ankunftszeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
            THEN GREATEST(0, EXTRACT(EPOCH FROM (
              (raw_data->>'Ankunftszeit der Fahrt')::timestamp - 
              (raw_data->>'Startzeit der Fahrt')::timestamp
            )) / 3600)
            ELSE 0
          END as trip_hours,
          CASE 
            WHEN raw_data->>'Startzeit der Fahrt' ~ '^\\d{4}-\\d{2}-\\d{2}'
            THEN EXTRACT(HOUR FROM (raw_data->>'Startzeit der Fahrt')::timestamp)
            ELSE EXTRACT(HOUR FROM order_time)
          END as start_hour
        FROM trips
        WHERE session_id = ${sessionId}
        ${dateFilter}
      ),
      trip_with_shift_type AS (
        SELECT 
          *,
          CASE 
            WHEN start_hour >= 6 AND start_hour < 18 THEN 'day'
            ELSE 'night'
          END as shift_type
        FROM trip_data
        WHERE license_plate IS NOT NULL AND license_plate != ''
      ),
      shift_detection AS (
        SELECT 
          license_plate,
          order_time,
          status,
          fare,
          distance_m,
          trip_hours,
          shift_type,
          CASE 
            WHEN LAG(order_time) OVER (
              PARTITION BY license_plate 
              ORDER BY order_time
            ) IS NULL 
            OR EXTRACT(EPOCH FROM (order_time - LAG(order_time) OVER (
              PARTITION BY license_plate 
              ORDER BY order_time
            ))) / 3600 > 5
            THEN 1
            ELSE 0
          END as is_new_shift
        FROM trip_with_shift_type
      ),
      vehicle_metrics AS (
        SELECT 
          license_plate,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_trips,
          COUNT(*) FILTER (WHERE status IN ('driver_cancelled', 'rider_cancelled', 'failed', 'delivery_failed')) as cancelled_trips,
          COUNT(*) as total_trips,
          SUM(CASE WHEN status = 'completed' THEN fare ELSE 0 END) as total_fare,
          SUM(CASE WHEN status = 'completed' AND shift_type = 'day' THEN fare ELSE 0 END) as day_fare,
          SUM(CASE WHEN status = 'completed' AND shift_type = 'night' THEN fare ELSE 0 END) as night_fare,
          SUM(distance_m) as total_distance_m,
          SUM(trip_hours) as total_hours,
          SUM(is_new_shift) as shift_count,
          SUM(CASE WHEN is_new_shift = 1 AND shift_type = 'day' THEN 1 ELSE 0 END) as day_shift_count,
          SUM(CASE WHEN is_new_shift = 1 AND shift_type = 'night' THEN 1 ELSE 0 END) as night_shift_count,
          COUNT(DISTINCT DATE(order_time)) as active_days,
          COUNT(DISTINCT TO_CHAR(order_time, 'YYYY-MM')) as active_months
        FROM shift_detection
        GROUP BY license_plate
      )
      SELECT 
        license_plate,
        completed_trips,
        cancelled_trips,
        total_trips,
        CASE WHEN completed_trips > 0 THEN total_fare / completed_trips ELSE 0 END as avg_fare_per_trip,
        total_distance_m as distance_in_trip,
        CASE WHEN total_distance_m > 0 THEN total_fare / total_distance_m ELSE 0 END as price_per_km,
        CASE WHEN active_days > 0 THEN total_fare / active_days ELSE 0 END as revenue_per_day,
        night_fare as revenue_night_shift,
        day_fare as revenue_day_shift,
        total_fare as total_revenue,
        CASE WHEN total_hours > 0 THEN total_fare / total_hours ELSE 0 END as revenue_per_hour,
        CASE WHEN total_hours > 0 THEN completed_trips::numeric / total_hours ELSE 0 END as trips_per_hour,
        CASE WHEN total_trips > 0 
          THEN (completed_trips::numeric / total_trips) * 100 
          ELSE 0 
        END as acceptance_rate,
        total_hours as time_in_trip,
        shift_count,
        day_shift_count,
        night_shift_count,
        active_days,
        active_months
      FROM vehicle_metrics
      ORDER BY total_fare DESC
    `);

    const vehicles: VehicleReportRow[] = (result.rows as any[]).map(row => ({
      licensePlate: row.license_plate || '',
      completedTrips: Number(row.completed_trips) || 0,
      cancelledTrips: Number(row.cancelled_trips) || 0,
      totalTrips: Number(row.total_trips) || 0,
      avgFarePerTrip: Number(row.avg_fare_per_trip) || 0,
      distanceInTrip: Number(row.distance_in_trip) || 0,
      pricePerKm: Number(row.price_per_km) || 0,
      revenuePerDay: Number(row.revenue_per_day) || 0,
      revenueNightShift: Number(row.revenue_night_shift) || 0,
      revenueDayShift: Number(row.revenue_day_shift) || 0,
      totalRevenue: Number(row.total_revenue) || 0,
      revenuePerHour: Number(row.revenue_per_hour) || 0,
      tripsPerHour: Number(row.trips_per_hour) || 0,
      acceptanceRate: Number(row.acceptance_rate) || 0,
      timeInTrip: Number(row.time_in_trip) || 0,
      shiftCount: Number(row.shift_count) || 0,
      dayShiftCount: Number(row.day_shift_count) || 0,
      nightShiftCount: Number(row.night_shift_count) || 0,
      occupancyRate: 0,
    }));

    const totalRevenue = vehicles.reduce((sum, v) => sum + v.totalRevenue, 0);
    const totalDistance = vehicles.reduce((sum, v) => sum + v.distanceInTrip, 0);
    const totalHoursWorked = vehicles.reduce((sum, v) => sum + v.timeInTrip, 0);
    const totalTrips = vehicles.reduce((sum, v) => sum + v.completedTrips, 0);
    const totalShifts = vehicles.reduce((sum, v) => sum + v.shiftCount, 0);
    const uniqueVehicles = vehicles.length;

    const totalActiveDays = (result.rows as any[]).reduce((sum: number, row: any) => sum + (Number(row.active_days) || 0), 0);
    const totalActiveMonths = (result.rows as any[]).reduce((sum: number, row: any) => sum + (Number(row.active_months) || 0), 0);

    const occupancyResult = await db.execute(sql`
      WITH daily_drivers AS (
        SELECT 
          license_plate,
          DATE(order_time) as trip_date,
          COUNT(DISTINCT CONCAT(
            COALESCE(raw_data->>'Vorname des Fahrers', ''),
            ' ',
            COALESCE(raw_data->>'Nachname des Fahrers', '')
          )) as driver_count
        FROM trips
        WHERE session_id = ${sessionId}
          AND license_plate IS NOT NULL 
          AND license_plate != ''
        ${dateFilter}
        GROUP BY license_plate, DATE(order_time)
      ),
      per_vehicle AS (
        SELECT 
          license_plate,
          AVG(LEAST(driver_count, 2)::numeric / 2 * 100) as occupancy_rate
        FROM daily_drivers
        GROUP BY license_plate
      )
      SELECT 
        pv.license_plate,
        pv.occupancy_rate,
        (SELECT AVG(LEAST(driver_count, 2)::numeric / 2 * 100) FROM daily_drivers) as avg_occupancy_rate
      FROM per_vehicle pv
    `);
    
    const occupancyByPlate = new Map<string, number>();
    let avgOccupancyRate = 0;
    for (const row of occupancyResult.rows as any[]) {
      occupancyByPlate.set(row.license_plate, Number(row.occupancy_rate) || 0);
      avgOccupancyRate = Number(row.avg_occupancy_rate) || 0;
    }
    
    for (const vehicle of vehicles) {
      vehicle.occupancyRate = occupancyByPlate.get(vehicle.licensePlate) || 0;
    }

    const summary: VehicleReportSummary = {
      totalRevenue,
      totalDistance,
      totalHoursWorked,
      totalTrips,
      totalShifts,
      uniqueVehicles,
      avgRevenuePerHour: totalHoursWorked > 0 ? totalRevenue / totalHoursWorked : 0,
      avgRevenuePerDay: totalActiveDays > 0 ? totalRevenue / totalActiveDays : 0,
      avgRevenuePerMonth: totalActiveMonths > 0 ? totalRevenue / totalActiveMonths : 0,
      avgRevenuePerKm: totalDistance > 0 ? totalRevenue / totalDistance : 0,
      avgRevenuePerTrip: totalTrips > 0 ? totalRevenue / totalTrips : 0,
      avgRevenuePerVehicle: uniqueVehicles > 0 ? totalRevenue / uniqueVehicles : 0,
      avgOccupancyRate,
    };

    return { summary, vehicles };
  }

  async getPromoReport(sessionId: string): Promise<{summary: PromoReportSummary, rows: PromoReportRow[]}> {
    const [aggregatedTripsResult, transactionsResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          license_plate as "licensePlate",
          TO_CHAR(order_time, 'YYYY-MM') as month,
          COUNT(*)::int as count
        FROM trips
        WHERE session_id = ${sessionId}
        GROUP BY license_plate, TO_CHAR(order_time, 'YYYY-MM')
        ORDER BY license_plate, month
      `),
      db.execute(sql`
        SELECT 
          license_plate,
          TO_CHAR(transaction_time, 'YYYY-MM') as month,
          SUM(amount)::int as total_amount
        FROM transactions
        WHERE session_id = ${sessionId}
        GROUP BY license_plate, TO_CHAR(transaction_time, 'YYYY-MM')
        ORDER BY license_plate, month
      `)
    ]);

    const aggregatedTrips = aggregatedTripsResult.rows as { licensePlate: string; month: string; count: number }[];
    const transactionsByPlateMonth = new Map<string, number>();
    
    for (const row of transactionsResult.rows as { license_plate: string; month: string; total_amount: number }[]) {
      const key = `${row.license_plate}-${row.month}`;
      transactionsByPlateMonth.set(key, (row.total_amount || 0) / 100);
    }

    const calculateBonus = (tripCount: number): number => {
      if (tripCount >= 170) return 400;
      if (tripCount >= 140) return 300;
      if (tripCount >= 110) return 200;
      if (tripCount >= 80) return 100;
      return 0;
    };

    const rows: PromoReportRow[] = aggregatedTrips.map(agg => {
      const tripCount = agg.count;
      const theoreticalBonus = calculateBonus(tripCount);
      const key = `${agg.licensePlate}-${agg.month}`;
      const actualPaid = transactionsByPlateMonth.get(key) || 0;
      const difference = theoreticalBonus - actualPaid;

      return {
        licensePlate: agg.licensePlate,
        month: agg.month,
        tripCount,
        theoreticalBonus,
        actualPaid,
        difference,
      };
    });

    const uniqueLicensePlates = new Set(rows.map(r => r.licensePlate));
    const uniqueMonths = new Set(rows.map(r => r.month));

    const summary: PromoReportSummary = {
      totalTheoreticalBonus: rows.reduce((sum, r) => sum + r.theoreticalBonus, 0),
      totalActualPaid: rows.reduce((sum, r) => sum + r.actualPaid, 0),
      totalDifference: rows.reduce((sum, r) => sum + r.difference, 0),
      totalTrips: rows.reduce((sum, r) => sum + r.tripCount, 0),
      licensePlateCount: uniqueLicensePlates.size,
      monthCount: uniqueMonths.size,
    };

    return { summary, rows };
  }

  async getCommissionAnalysis(sessionId: string, startDate?: Date, endDate?: Date): Promise<CommissionAnalysis> {
    // Get all transactions with trip data (where tripUuid is set)
    let query = sql`
      SELECT 
        t.trip_uuid,
        t.revenue,
        t.fare_price,
        t.transaction_time,
        t.license_plate,
        t.raw_data
      FROM transactions t
      WHERE t.session_id = ${sessionId}
        AND t.trip_uuid IS NOT NULL
        AND t.fare_price IS NOT NULL
    `;
    
    if (startDate) {
      query = sql`${query} AND t.transaction_time >= ${startDate}`;
    }
    if (endDate) {
      query = sql`${query} AND t.transaction_time <= ${endDate}`;
    }
    
    const result = await db.execute(query);
    const txRows = result.rows as Array<{
      trip_uuid: string;
      revenue: number | null;
      fare_price: number | null;
      transaction_time: Date;
      license_plate: string;
      raw_data: any;
    }>;

    // Group by tripUuid to aggregate multiple payments per trip
    const tripMap = new Map<string, {
      farePrice: number;
      revenue: number;
      licensePlate: string;
      driverName: string;
      month: string;
    }>();

    for (const tx of txRows) {
      const tripUuid = tx.trip_uuid;
      const existing = tripMap.get(tripUuid);
      const farePrice = tx.fare_price || 0;
      const revenue = tx.revenue || 0;
      
      // Extract driver name from rawData
      let driverName = 'Unbekannt';
      if (tx.raw_data) {
        const rawData = typeof tx.raw_data === 'string' ? JSON.parse(tx.raw_data) : tx.raw_data;
        const firstName = rawData['Vorname des Fahrers'] || '';
        const lastName = rawData['Nachname des Fahrers'] || '';
        if (firstName || lastName) {
          driverName = `${firstName} ${lastName}`.trim();
        }
      }
      
      const month = tx.transaction_time.toISOString().slice(0, 7); // YYYY-MM
      
      if (existing) {
        // Sum up values for the same trip
        existing.farePrice += farePrice;
        existing.revenue += revenue;
      } else {
        tripMap.set(tripUuid, {
          farePrice,
          revenue,
          licensePlate: tx.license_plate,
          driverName,
          month,
        });
      }
    }

    // Calculate totals
    let totalFarePrice = 0;
    let totalRevenue = 0;
    const tripCount = tripMap.size;
    
    // Aggregate by driver
    const driverMap = new Map<string, { farePrice: number; revenue: number; tripCount: number }>();
    // Aggregate by vehicle
    const vehicleMap = new Map<string, { farePrice: number; revenue: number; tripCount: number }>();
    // Aggregate by month
    const monthMap = new Map<string, { farePrice: number; revenue: number; tripCount: number }>();

    for (const trip of Array.from(tripMap.values())) {
      totalFarePrice += trip.farePrice;
      totalRevenue += trip.revenue;
      
      // By driver
      const driverStats = driverMap.get(trip.driverName) || { farePrice: 0, revenue: 0, tripCount: 0 };
      driverStats.farePrice += trip.farePrice;
      driverStats.revenue += trip.revenue;
      driverStats.tripCount += 1;
      driverMap.set(trip.driverName, driverStats);
      
      // By vehicle
      const vehicleStats = vehicleMap.get(trip.licensePlate) || { farePrice: 0, revenue: 0, tripCount: 0 };
      vehicleStats.farePrice += trip.farePrice;
      vehicleStats.revenue += trip.revenue;
      vehicleStats.tripCount += 1;
      vehicleMap.set(trip.licensePlate, vehicleStats);
      
      // By month
      const monthStats = monthMap.get(trip.month) || { farePrice: 0, revenue: 0, tripCount: 0 };
      monthStats.farePrice += trip.farePrice;
      monthStats.revenue += trip.revenue;
      monthStats.tripCount += 1;
      monthMap.set(trip.month, monthStats);
    }

    const totalCommission = totalFarePrice - totalRevenue;
    const commissionPercent = totalFarePrice > 0 ? (totalCommission / totalFarePrice) * 100 : 0;

    const byDriver = Array.from(driverMap.entries()).map(([driverName, stats]) => ({
      driverName,
      farePrice: stats.farePrice,
      revenue: stats.revenue,
      commission: stats.farePrice - stats.revenue,
      commissionPercent: stats.farePrice > 0 ? ((stats.farePrice - stats.revenue) / stats.farePrice) * 100 : 0,
      tripCount: stats.tripCount,
    })).sort((a, b) => b.tripCount - a.tripCount);

    const byVehicle = Array.from(vehicleMap.entries()).map(([licensePlate, stats]) => ({
      licensePlate,
      farePrice: stats.farePrice,
      revenue: stats.revenue,
      commission: stats.farePrice - stats.revenue,
      commissionPercent: stats.farePrice > 0 ? ((stats.farePrice - stats.revenue) / stats.farePrice) * 100 : 0,
      tripCount: stats.tripCount,
    })).sort((a, b) => b.tripCount - a.tripCount);

    const byMonth = Array.from(monthMap.entries()).map(([month, stats]) => ({
      month,
      farePrice: stats.farePrice,
      revenue: stats.revenue,
      commission: stats.farePrice - stats.revenue,
      commissionPercent: stats.farePrice > 0 ? ((stats.farePrice - stats.revenue) / stats.farePrice) * 100 : 0,
      tripCount: stats.tripCount,
    })).sort((a, b) => a.month.localeCompare(b.month));

    return {
      summary: {
        totalFarePrice,
        totalRevenue,
        totalCommission,
        commissionPercent,
        tripCount,
      },
      byDriver,
      byVehicle,
      byMonth,
    };
  }
}

export const storage = new DatabaseStorage();
