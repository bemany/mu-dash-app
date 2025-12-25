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
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("trips_dedup_idx").on(table.sessionId, table.licensePlate, table.orderTime),
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
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("transactions_dedup_idx").on(table.sessionId, table.licensePlate, table.transactionTime, table.amount),
]);

// Uploads table - stores original CSV files
export const uploads = pgTable("uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  fileType: text("file_type").notNull(), // 'trips' or 'payments'
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // in bytes
  content: text("content").notNull(), // base64 encoded file content
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
