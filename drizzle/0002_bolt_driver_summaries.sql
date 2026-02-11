-- Create bolt_driver_summaries table
CREATE TABLE IF NOT EXISTS "bolt_driver_summaries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" text NOT NULL,
  "driver_name" text NOT NULL,
  "email" text,
  "phone" text,
  "gross_total" integer,
  "gross_in_app" integer,
  "gross_cash" integer,
  "cash_received" integer,
  "tips" integer,
  "campaign_revenue" integer,
  "cancellation_fees" integer,
  "toll_fees" integer,
  "booking_fees" integer,
  "total_fees" integer,
  "commission" integer,
  "refunds" integer,
  "other_fees" integer,
  "net_revenue" integer,
  "expected_payout" integer,
  "gross_hourly" integer,
  "net_hourly" integer,
  "driver_id" text,
  "custom_id" text,
  "raw_data" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create unique index for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS "bolt_driver_summaries_dedup_idx" ON "bolt_driver_summaries" ("session_id", "driver_name", "email");
