import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session table - tracks each user session
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  vorgangsId: text("vorgangs_id").unique(),
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
});

// Transactions table - stores payment transaction data
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  licensePlate: text("license_plate").notNull(),
  transactionTime: timestamp("transaction_time").notNull(),
  amount: integer("amount").notNull(), // in cents to avoid floating point issues
  description: text("description"),
  rawData: jsonb("raw_data"),
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

// Types
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = z.infer<typeof insertTripSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
