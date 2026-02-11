import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table - tracks each user session
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  vorgangsId: text("vorgangs_id").unique(),
  companyName: text("company_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(),
  currentStep: integer("current_step").notNull().default(1),
});

// Trips table - stores uploaded trip data
export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  tripId: text("trip_id"),
  licensePlate: text("license_plate").notNull(),
  orderTime: timestamp("order_time").notNull(),
  tripStatus: text("trip_status").notNull(),
  platform: text("platform").notNull().default('uber'), // 'uber' | 'bolt'
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("trips_dedup_idx").on(table.sessionId, table.licensePlate, table.orderTime, table.platform),
]);

// Transactions table - stores payment transaction data
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  licensePlate: text("license_plate").notNull(),
  transactionTime: timestamp("transaction_time").notNull(),
  amount: integer("amount").notNull(), // in cents to avoid floating point issues
  description: text("description"),
  tripUuid: text("trip_uuid"), // UUID of the trip for matching with trips table
  revenue: integer("revenue"), // "Deine Umsätze" in cents
  farePrice: integer("fare_price"), // "Fahrpreis" in cents
  platform: text("platform").notNull().default('uber'), // 'uber' | 'bolt'
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("transactions_dedup_idx").on(table.sessionId, table.licensePlate, table.transactionTime, table.amount, table.platform),
]);

// Uploads table - stores original CSV files
export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  fileType: text("file_type").notNull(), // 'trips' or 'payments' or 'campaign'
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // in bytes
  content: text("content").notNull(), // base64 encoded file content
  platform: text("platform").notNull().default('uber'), // 'uber' | 'bolt'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Bolt driver summaries table - stores Bolt "Umsatz pro Fahrer_in" data
// This is separate from transactions because it's aggregated driver-level data,
// not individual transactions. May contain bonus payments and other relevant future data.
export const boltDriverSummaries = pgTable("bolt_driver_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  driverName: text("driver_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  grossTotal: integer("gross_total"), // Bruttoverdienst (insgesamt) in cents
  grossInApp: integer("gross_in_app"), // Bruttoeinnahmen (In-App-Zahlung) in cents
  grossCash: integer("gross_cash"), // Bruttoeinnahmen (Barzahlung) in cents
  cashReceived: integer("cash_received"), // Erhaltenes Bargeld in cents
  tips: integer("tips"), // Trinkgelder in cents
  campaignRevenue: integer("campaign_revenue"), // Kampagneneinnahmen in cents
  cancellationFees: integer("cancellation_fees"), // Stornogebühren in cents
  tollFees: integer("toll_fees"), // Mautgebühren in cents
  bookingFees: integer("booking_fees"), // Buchungsgebühren in cents
  totalFees: integer("total_fees"), // Gesamtgebühren in cents
  commission: integer("commission"), // Provision in cents
  refunds: integer("refunds"), // Rückerstattungen in cents
  otherFees: integer("other_fees"), // Sonstige Gebühren in cents
  netRevenue: integer("net_revenue"), // Umsatz netto in cents
  expectedPayout: integer("expected_payout"), // Voraussichtliche Auszahlung in cents
  grossHourly: integer("gross_hourly"), // Bruttoverdienst pro Stunde in cents
  netHourly: integer("net_hourly"), // Nettoverdienst pro Stunde in cents
  driverId: text("driver_id"), // Fahrer-ID
  customId: text("custom_id"), // Individueller Identifikator
  rawData: jsonb("raw_data"), // Full row data for future use
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("bolt_driver_summaries_dedup_idx").on(table.sessionId, table.driverName, table.email),
]);

// Performance logs table - tracks import and load performance
export const performanceLogs = pgTable("performance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vorgangsId: text("vorgangs_id"),
  operationType: text("operation_type").notNull(), // 'import' or 'load'
  softwareVersion: text("software_version").notNull(),
  durationMs: integer("duration_ms").notNull(),
  tripCount: integer("trip_count").notNull().default(0),
  transactionCount: integer("transaction_count").notNull().default(0),
  recordsPerSecond: integer("records_per_second"), // calculated: (tripCount + transactionCount) / (durationMs / 1000)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Import logs table - detailed logging for import operations
export const importLogs = pgTable("import_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  vorgangsId: text("vorgangs_id"),
  level: text("level").notNull(), // 'info', 'warn', 'error', 'debug'
  phase: text("phase").notNull(), // 'upload', 'parse', 'validate', 'insert', 'complete', 'error'
  message: text("message").notNull(),
  details: jsonb("details"), // additional structured data (memory usage, counts, errors, etc.)
  memoryUsageMb: integer("memory_usage_mb"), // heap used in MB
  recordsProcessed: integer("records_processed"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertUploadSchema = createInsertSchema(uploads).omit({
  id: true,
  createdAt: true,
});

export const insertPerformanceLogSchema = createInsertSchema(performanceLogs).omit({
  id: true,
  createdAt: true,
});

export const insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  createdAt: true,
});

export const insertBoltDriverSummarySchema = createInsertSchema(boltDriverSummaries).omit({
  id: true,
  createdAt: true,
});

// Types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = z.infer<typeof insertUploadSchema>;

export type PerformanceLog = typeof performanceLogs.$inferSelect;
export type InsertPerformanceLog = z.infer<typeof insertPerformanceLogSchema>;

export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = z.infer<typeof insertImportLogSchema>;

export type BoltDriverSummary = typeof boltDriverSummaries.$inferSelect;
export type InsertBoltDriverSummary = z.infer<typeof insertBoltDriverSummarySchema>;
