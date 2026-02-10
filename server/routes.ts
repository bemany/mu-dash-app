import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { progressBroker } from "./progress-broker";
import { createImportLogger, type ImportPhase } from "./logger";
import { z } from "zod";
import { parseISO, parse } from "date-fns";
import multer from "multer";
import Papa from "papaparse";
import type { InsertTrip, InsertTransaction } from "@shared/schema";
import { classifyFile, normalizeBoltStatus, parseBoltTimestamp, parseBoltEuroAmount, type Platform, type PlatformFileClassification } from "./platform-config";

const SOFTWARE_VERSION = "2.5.0";
const BUILD_NUMBER = "250108-1";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit for large CSV files
});

const LICENSE_PLATE_REGEX = /[A-Z]{1,3}-[A-Z]{1,3}\s?\d{1,4}[A-Z]?/i;

function isPromoPayment(description: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return lower.includes("fahrzeugbasierte aktion") && lower.includes("fahrten");
}

function extractPromoLicensePlate(description: string): string | null {
  if (!isPromoPayment(description)) return null;
  
  const match = description.match(LICENSE_PLATE_REGEX);
  if (!match) return null;
  
  const plate = match[0].toUpperCase().replace(/\s/g, '');
  
  if (isLikelyUuidFragment(plate, description)) return null;
  
  return plate;
}

function isLikelyUuidFragment(plate: string, description: string): boolean {
  const platePos = description.toUpperCase().indexOf(plate);
  if (platePos === -1) return false;
  
  const before = description.substring(Math.max(0, platePos - 10), platePos);
  const after = description.substring(platePos + plate.length, platePos + plate.length + 10);
  
  const uuidPattern = /[0-9a-f]{4,}-|[0-9a-f]{8,}/i;
  if (uuidPattern.test(before) || uuidPattern.test(after)) {
    return true;
  }
  
  const surroundingText = description.substring(
    Math.max(0, platePos - 20), 
    Math.min(description.length, platePos + plate.length + 20)
  );
  const fullUuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  if (fullUuidPattern.test(surroundingText)) {
    return true;
  }
  
  return false;
}

function extractLicensePlate(description: string): string | null {
  if (!description) return null;
  
  if (isPromoPayment(description)) {
    return extractPromoLicensePlate(description);
  }
  
  const match = description.match(LICENSE_PLATE_REGEX);
  if (!match) return null;
  
  const plate = match[0].toUpperCase().replace(/\s/g, '');
  
  if (isLikelyUuidFragment(plate, description)) {
    return null;
  }
  
  return plate;
}

function parsePaymentTimestamp(timestamp: string): Date {
  const cleanTimestamp = timestamp.replace(/ \+\d{4} [A-Z]+$/, '').trim();
  
  const formats = [
    "yyyy-MM-dd HH:mm:ss.SSS",
    "yyyy-MM-dd HH:mm:ss",
    "yyyy-MM-dd'T'HH:mm:ss.SSS",
    "yyyy-MM-dd'T'HH:mm:ss",
    "dd.MM.yyyy HH:mm:ss",
    "dd.MM.yyyy HH:mm",
  ];
  
  for (const fmt of formats) {
    try {
      const result = parse(cleanTimestamp, fmt, new Date());
      if (!isNaN(result.getTime())) {
        return result;
      }
    } catch {
      // Try next format
    }
  }
  
  // Try ISO parsing as fallback
  try {
    const isoResult = parseISO(timestamp);
    if (!isNaN(isoResult.getTime())) {
      return isoResult;
    }
  } catch {
    // Fall through to return Invalid Date
  }
  
  return new Date(NaN);
}

const STREAMING_BATCH_SIZE = 1000;

interface StreamingResult {
  count: number;
  companyName?: string;
  dateRange?: { minDate: Date; maxDate: Date };
  platform: Platform;
}

function parseEuroAmount(value: any): number | null {
  if (value === undefined || value === null || value === '') return null;
  const numVal = typeof value === 'string' 
    ? parseFloat(value.replace(',', '.')) 
    : value;
  return isNaN(numVal) ? null : Math.round(numVal * 100);
}

async function processTripFileStreaming(
  file: Express.Multer.File,
  sessionId: string,
  seenKeys: Set<string>,
  onBatch: (batch: InsertTrip[]) => Promise<void>
): Promise<StreamingResult> {
  return new Promise((resolve, reject) => {
    const buffer: InsertTrip[] = [];
    let count = 0;
    let minDate: Date | undefined;
    let maxDate: Date | undefined;
    let pendingBatch: Promise<void> | null = null;
    
    const content = file.buffer.toString('utf-8');
    
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        const trip = results.data as any;
        
        if (!trip["Kennzeichen"] || !trip["Zeitpunkt der Fahrtbestellung"]) return;
        if (!trip["Fahrtstatus"]) return;
        
        const orderTime = parseISO(trip["Zeitpunkt der Fahrtbestellung"]);
        if (!orderTime || isNaN(orderTime.getTime())) return;
        
        const licensePlate = trip["Kennzeichen"].toString().trim();
        const key = `${licensePlate}-${orderTime.getTime()}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        
        if (!minDate || orderTime < minDate) minDate = orderTime;
        if (!maxDate || orderTime > maxDate) maxDate = orderTime;
        
        const dbTrip: InsertTrip = {
          sessionId,
          tripId: trip["Fahrt-ID"] ? trip["Fahrt-ID"].toString().trim() : null,
          licensePlate,
          orderTime,
          tripStatus: trip["Fahrtstatus"].toString().trim(),
          platform: 'uber',
          rawData: trip,
        };
        
        buffer.push(dbTrip);
        count++;
        
        if (buffer.length >= STREAMING_BATCH_SIZE) {
          const batchToInsert = [...buffer];
          buffer.length = 0;
          pendingBatch = onBatch(batchToInsert);
        }
      },
      complete: async () => {
        try {
          if (pendingBatch) await pendingBatch;
          if (buffer.length > 0) {
            await onBatch([...buffer]);
          }
          resolve({
            count,
            dateRange: minDate && maxDate ? { minDate, maxDate } : undefined,
            platform: 'uber',
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}

async function processPaymentFileStreaming(
  file: Express.Multer.File,
  sessionId: string,
  seenKeys: Set<string>,
  onBatch: (batch: InsertTransaction[]) => Promise<void>
): Promise<StreamingResult> {
  return new Promise((resolve, reject) => {
    const buffer: InsertTransaction[] = [];
    let count = 0;
    let companyName: string | undefined;
    let pendingBatch: Promise<void> | null = null;
    
    const content = file.buffer.toString('utf-8');
    
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        const tx = results.data as any;
        
        let amount: number;
        if (tx["An dein Unternehmen gezahlt"] !== undefined) {
          amount = typeof tx["An dein Unternehmen gezahlt"] === 'string'
            ? parseFloat(tx["An dein Unternehmen gezahlt"].replace(',', '.'))
            : tx["An dein Unternehmen gezahlt"];
        } else {
          amount = typeof tx["Betrag"] === 'string'
            ? parseFloat(tx["Betrag"].replace(',', '.'))
            : tx["Betrag"];
        }

        let timestamp: Date;
        if (tx["vs-Berichterstattung"]) {
          timestamp = parsePaymentTimestamp(tx["vs-Berichterstattung"]);
        } else if (tx["Zeitpunkt"]) {
          timestamp = parsePaymentTimestamp(tx["Zeitpunkt"]);
        } else {
          return;
        }

        if (isNaN(timestamp.getTime())) return;

        let licensePlate = tx["Kennzeichen"] ? tx["Kennzeichen"].toString().trim() : null;
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = extractLicensePlate(tx["Beschreibung"]);
        }
        
        const amountCents = Math.round(amount * 100);
        const normalizedPlate = licensePlate ? licensePlate.trim() : 'unknown';
        const key = `${normalizedPlate}-${timestamp.getTime()}-${amountCents}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);
        
        if (!companyName) {
          companyName = tx["Name des Unternehmens"] || tx["Firmenname"];
        }
        
        const tripUuid = tx["Fahrt-UUID"] ? tx["Fahrt-UUID"].toString().trim() : null;
        const revenue = parseEuroAmount(
          tx["An dein Unternehmen gezahlt : Deine Umsätze"] || 
          tx["An dein Unternehmen gezahlt:Deine Umsätze"] ||
          tx["revenue"]
        );
        const farePrice = parseEuroAmount(
          tx["An dein Unternehmen gezahlt : Deine Umsätze : Fahrpreis"] || 
          tx["An dein Unternehmen gezahlt:Deine Umsätze:Fahrpreis"] ||
          tx["farePrice"]
        );

        const dbTx: InsertTransaction = {
          sessionId,
          licensePlate: licensePlate || "",
          transactionTime: timestamp,
          amount: amountCents,
          description: tx["Beschreibung"] || null,
          tripUuid,
          revenue,
          farePrice,
          platform: 'uber',
          rawData: tx,
        };
        
        buffer.push(dbTx);
        count++;
        
        if (buffer.length >= STREAMING_BATCH_SIZE) {
          const batchToInsert = [...buffer];
          buffer.length = 0;
          pendingBatch = onBatch(batchToInsert);
        }
      },
      complete: async () => {
        try {
          if (pendingBatch) await pendingBatch;
          if (buffer.length > 0) {
            await onBatch([...buffer]);
          }
          resolve({ count, companyName, platform: 'uber' });
        } catch (err) {
          reject(err);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}

// ---------------------------------------------------------------------------
// Bolt Trip File Parser (Fahrtenübersicht)
// ---------------------------------------------------------------------------
async function processBoltTripFileStreaming(
  file: Express.Multer.File,
  sessionId: string,
  seenKeys: Set<string>,
  onBatch: (batch: InsertTrip[]) => Promise<void>
): Promise<StreamingResult> {
  return new Promise((resolve, reject) => {
    const buffer: InsertTrip[] = [];
    let count = 0;
    let minDate: Date | undefined;
    let maxDate: Date | undefined;
    let pendingBatch: Promise<void> | null = null;

    const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, ''); // Strip BOM

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        const trip = results.data as any;

        const rawPlate = trip["Kfz-Kennzeichen"];
        const rawDatum = trip["Datum"];
        const rawStatus = trip["Status"];

        if (!rawPlate || !rawDatum || !rawStatus) return;

        const orderTime = parseBoltTimestamp(rawDatum);
        if (!orderTime || isNaN(orderTime.getTime())) return;

        const licensePlate = rawPlate.toString().trim().toUpperCase().replace(/\s/g, '');
        const key = `${licensePlate}-${orderTime.getTime()}-bolt`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        if (!minDate || orderTime < minDate) minDate = orderTime;
        if (!maxDate || orderTime > maxDate) maxDate = orderTime;

        const normalizedStatus = normalizeBoltStatus(rawStatus);

        const dbTrip: InsertTrip = {
          sessionId,
          tripId: trip["Individueller Identifikator"] ? trip["Individueller Identifikator"].toString().trim() : null,
          licensePlate,
          orderTime,
          tripStatus: normalizedStatus,
          platform: 'bolt',
          rawData: trip,
        };

        buffer.push(dbTrip);
        count++;

        if (buffer.length >= STREAMING_BATCH_SIZE) {
          const batchToInsert = [...buffer];
          buffer.length = 0;
          pendingBatch = onBatch(batchToInsert);
        }
      },
      complete: async () => {
        try {
          if (pendingBatch) await pendingBatch;
          if (buffer.length > 0) {
            await onBatch([...buffer]);
          }
          resolve({
            count,
            dateRange: minDate && maxDate ? { minDate, maxDate } : undefined,
            platform: 'bolt',
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}

// ---------------------------------------------------------------------------
// Bolt Financial File Parser (Umsatz pro Fahrer_in)
// ---------------------------------------------------------------------------
async function processBoltFinancialFileStreaming(
  file: Express.Multer.File,
  sessionId: string,
  seenKeys: Set<string>,
  onBatch: (batch: InsertTransaction[]) => Promise<void>
): Promise<StreamingResult> {
  return new Promise((resolve, reject) => {
    const buffer: InsertTransaction[] = [];
    let count = 0;
    let companyName: string | undefined;
    let pendingBatch: Promise<void> | null = null;

    const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');

    // Extract month from filename pattern: "...-2025-11-..."
    const monthMatch = file.originalname.match(/(\d{4})-(\d{2})/);
    const fileMonth = monthMatch
      ? new Date(parseInt(monthMatch[1]), parseInt(monthMatch[2]) - 1, 1)
      : new Date();

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        const row = results.data as any;

        const driverName = row["Fahrer:in"]?.toString().trim();
        if (!driverName || driverName === '—') return;

        const expectedPayout = parseBoltEuroAmount(row["Voraussichtliche Auszahlung|€"]);
        const netRevenue = parseBoltEuroAmount(row["Umsatz netto|€"]);
        const grossTotal = parseBoltEuroAmount(row["Bruttoverdienst (insgesamt)|€"]);

        const amountCents = Math.round(expectedPayout * 100);
        const revenueCents = Math.round(netRevenue * 100);
        const farePriceCents = Math.round(grossTotal * 100);

        // Dedup key: driver + month + amount
        const key = `bolt-fin-${driverName}-${fileMonth.getTime()}-${amountCents}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        // License plate will be empty initially – lazy cross-ref fills it later
        const dbTx: InsertTransaction = {
          sessionId,
          licensePlate: "",
          transactionTime: fileMonth,
          amount: amountCents,
          description: "bolt_driver_monthly_summary",
          tripUuid: null,
          revenue: revenueCents,
          farePrice: farePriceCents,
          platform: 'bolt',
          rawData: row,
        };

        buffer.push(dbTx);
        count++;

        if (buffer.length >= STREAMING_BATCH_SIZE) {
          const batchToInsert = [...buffer];
          buffer.length = 0;
          pendingBatch = onBatch(batchToInsert);
        }
      },
      complete: async () => {
        try {
          if (pendingBatch) await pendingBatch;
          if (buffer.length > 0) {
            await onBatch([...buffer]);
          }
          resolve({ count, companyName, platform: 'bolt' });
        } catch (err) {
          reject(err);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}

// ---------------------------------------------------------------------------
// Bolt Campaign File Parser (Kampagnenbericht)
// ---------------------------------------------------------------------------
async function processBoltCampaignFileStreaming(
  file: Express.Multer.File,
  sessionId: string,
  seenKeys: Set<string>,
  onBatch: (batch: InsertTransaction[]) => Promise<void>
): Promise<StreamingResult> {
  return new Promise((resolve, reject) => {
    const buffer: InsertTransaction[] = [];
    let count = 0;
    let pendingBatch: Promise<void> | null = null;

    const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      step: (results) => {
        const row = results.data as any;

        const driverName = row["Name Fahrer:in"]?.toString().trim();
        const campaignName = row["Name der Kampagne"]?.toString().trim();
        const revenueStr = row["Erzielter Umsatz"]?.toString().trim();

        if (!driverName || !campaignName) return;

        const amount = parseBoltEuroAmount(revenueStr);
        if (amount === 0) return; // Skip campaigns with 0 payout

        const amountCents = Math.round(amount * 100);

        // Parse campaign period for timestamp
        const periodStart = parseBoltTimestamp(row["Zeitraum Beginn"]);
        const timestamp = periodStart || new Date();

        const key = `bolt-campaign-${driverName}-${campaignName}-${timestamp.getTime()}-${amountCents}`;
        if (seenKeys.has(key)) return;
        seenKeys.add(key);

        const dbTx: InsertTransaction = {
          sessionId,
          licensePlate: "", // Will be filled by lazy cross-ref
          transactionTime: timestamp,
          amount: amountCents,
          description: `Bolt Kampagne: ${campaignName}`,
          tripUuid: null,
          revenue: amountCents,
          farePrice: null,
          platform: 'bolt',
          rawData: row,
        };

        buffer.push(dbTx);
        count++;

        if (buffer.length >= STREAMING_BATCH_SIZE) {
          const batchToInsert = [...buffer];
          buffer.length = 0;
          pendingBatch = onBatch(batchToInsert);
        }
      },
      complete: async () => {
        try {
          if (pendingBatch) await pendingBatch;
          if (buffer.length > 0) {
            await onBatch([...buffer]);
          }
          resolve({ count, platform: 'bolt' });
        } catch (err) {
          reject(err);
        }
      },
      error: (error: any) => reject(error),
    });
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Helper function to create a new session ID (called only when importing data)
  function ensureSessionId(req: Request): string {
    if (!req.session.uberRetterSessionId) {
      req.session.uberRetterSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log("[Session] Created new session ID:", req.session.uberRetterSessionId);
    }
    return req.session.uberRetterSessionId;
  }

  app.get("/api/session", async (req, res) => {
    console.log("[Session] GET /api/session called");
    console.log("[Session] Express session ID:", req.sessionID);
    console.log("[Session] uberRetterSessionId:", req.session.uberRetterSessionId);
    console.log("[Session] Cookie header present:", !!req.headers.cookie);
    console.log("[Session] connect.sid cookie present:", !!req.headers.cookie?.includes('connect.sid'));
    
    try {
      const sessionId = req.session.uberRetterSessionId;
      
      // If no session exists yet, return empty data (no DB session created)
      if (!sessionId) {
        console.log("[Session] No session yet - returning empty state");
        return res.json({
          sessionId: null,
          vorgangsId: null,
          companyName: null,
          currentStep: 1,
          tripCount: 0,
          aggregatedTrips: [],
          transactions: [],
        });
      }
      
      console.log("[Session] Looking up session:", sessionId);
      const session = await storage.getSessionById(sessionId);
      
      // Session ID exists in cookie but not in DB (maybe cleaned up) - return empty
      if (!session) {
        console.log("[Session] Session not found in DB - returning empty state");
        return res.json({
          sessionId: null,
          vorgangsId: null,
          companyName: null,
          currentStep: 1,
          tripCount: 0,
          aggregatedTrips: [],
          transactions: [],
        });
      }
      
      console.log("[Session] Session found:", session.sessionId);
      
      // Use count to check if there's data
      const [tripCount, transactionCount] = await Promise.all([
        storage.getTripCountBySession(sessionId),
        storage.getTransactionCountBySession(sessionId),
      ]);

      let vorgangsId = session.vorgangsId;
      if (!vorgangsId && tripCount > 0) {
        vorgangsId = await storage.generateVorgangsId(sessionId);
      }

      // For sessions with many trips, use aggregated data
      // This prevents loading 260,000+ rows into memory
      const aggregatedTrips = await storage.getAggregatedTripsBySession(sessionId);
      
      // For large sessions (>10,000 transactions), don't load all transactions
      // This prevents JSON.stringify RangeError for very large datasets
      const MAX_TRANSACTIONS_IN_SESSION = 10000;
      let frontendTransactions: any[] = [];
      
      if (transactionCount <= MAX_TRANSACTIONS_IN_SESSION) {
        const transactions = await storage.getTransactionsBySession(sessionId);
        frontendTransactions = transactions.map(tx => ({
          "Kennzeichen": tx.licensePlate,
          "Zeitpunkt": tx.transactionTime.toISOString(),
          "Betrag": tx.amount / 100,
          "Beschreibung": tx.description || undefined,
          ...tx.rawData as any,
        }));
      }

      res.json({
        sessionId,
        vorgangsId,
        companyName: session.companyName,
        currentStep: session.currentStep,
        tripCount,
        transactionCount,
        aggregatedTrips,
        transactions: frontendTransactions,
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session data" });
    }
  });

  app.post("/api/session/vorgangsid", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const vorgangsId = await storage.generateVorgangsId(sessionId);
      res.json({ vorgangsId });
    } catch (error) {
      console.error("Error generating vorgangsId:", error);
      res.status(500).json({ error: "Failed to generate Vorgangs-ID" });
    }
  });

  app.post("/api/session/load", async (req, res) => {
    const startTime = Date.now();
    console.log("[Load] Starting session load, request vorgangsId:", req.body?.vorgangsId);
    console.log("[Load] Current express session ID:", req.sessionID);
    console.log("[Load] Current uberRetterSessionId before load:", req.session.uberRetterSessionId);
    console.log("[Load] Session cookie present:", !!req.headers.cookie?.includes('connect.sid'));
    
    try {
      const { vorgangsId } = req.body;
      
      if (!vorgangsId || typeof vorgangsId !== "string") {
        console.log("[Load] Error: No vorgangsId provided");
        return res.status(400).json({ error: "Vorgangs-ID erforderlich" });
      }

      const normalizedId = vorgangsId.trim().toUpperCase();
      console.log("[Load] Looking up session for vorgangsId:", normalizedId);
      
      const session = await storage.getSessionByVorgangsId(normalizedId);
      
      if (!session) {
        console.log("[Load] Error: No session found for vorgangsId:", normalizedId);
        return res.status(404).json({ error: "Keine Session mit dieser Vorgangs-ID gefunden" });
      }
      
      console.log("[Load] Found session:", session.sessionId);

      const tripCount = await storage.getTripCountBySession(session.sessionId);
      console.log("[Load] Trip count:", tripCount);
      
      if (tripCount === 0) {
        console.log("[Load] Error: Session has no trips");
        return res.status(404).json({ error: "Dieser Vorgang enthält keine Daten mehr" });
      }

      const transactionCount = await storage.getTransactionCountBySession(session.sessionId);
      console.log("[Load] Transaction count:", transactionCount);

      const oldSessionId = req.session.uberRetterSessionId;
      req.session.uberRetterSessionId = session.sessionId;
      console.log("[Load] Changed uberRetterSessionId from", oldSessionId, "to", session.sessionId);
      
      if (session.currentStep === 1 && tripCount > 0) {
        const newStep = transactionCount > 0 ? 3 : 2;
        await storage.updateSessionActivity(session.sessionId, newStep);
      }

      // Explicitly save session before sending response
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[Load] Error saving session:", err);
            reject(err);
          } else {
            console.log("[Load] Session saved successfully");
            resolve();
          }
        });
      });

      // Log performance
      const durationMs = Date.now() - startTime;
      console.log("[Load] Load completed in", durationMs, "ms");
      
      try {
        await storage.createPerformanceLog({
          vorgangsId: normalizedId,
          operationType: "load",
          softwareVersion: SOFTWARE_VERSION,
          durationMs,
          tripCount,
          transactionCount,
          recordsPerSecond: 0,
        });
      } catch (logError) {
        console.error("Failed to log performance metrics:", logError);
      }
      
      res.json({ success: true, sessionId: session.sessionId });
    } catch (error) {
      console.error("[Load] Error loading session:", error);
      res.status(500).json({ error: "Failed to load session" });
    }
  });

  app.post("/api/session/exit", async (req, res) => {
    try {
      req.session.uberRetterSessionId = undefined;
      res.json({ success: true });
    } catch (error) {
      console.error("Error exiting session:", error);
      res.status(500).json({ error: "Failed to exit session" });
    }
  });

  app.post("/api/session/step", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { step } = req.body;
      
      if (typeof step !== "number") {
        return res.status(400).json({ error: "Invalid step" });
      }

      await storage.updateSessionActivity(sessionId, step);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating step:", error);
      res.status(500).json({ error: "Failed to update step" });
    }
  });

  app.post("/api/trips", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { trips } = req.body;

      if (!Array.isArray(trips)) {
        return res.status(400).json({ error: "Invalid trips data" });
      }

      // Filter out invalid trips and same-batch duplicates only
      // Database handles session-level duplicates via ON CONFLICT DO NOTHING
      const seenIds = new Set<string>();
      const validTrips = trips.filter((trip: any) => {
        if (!trip["Kennzeichen"] || !trip["Zeitpunkt der Fahrtbestellung"]) {
          return false;
        }
        if (!trip["Fahrtstatus"]) {
          return false;
        }
        const orderTime = parseISO(trip["Zeitpunkt der Fahrtbestellung"]);
        if (!orderTime || isNaN(orderTime.getTime())) {
          return false;
        }
        const id = `${trip["Kennzeichen"].trim()}-${orderTime.getTime()}`;
        if (seenIds.has(id)) {
          return false;
        }
        seenIds.add(id);
        return true;
      });

      const dbTrips = validTrips.map((trip: any) => ({
        sessionId,
        tripId: trip["Fahrt-ID"] || null,
        licensePlate: trip["Kennzeichen"],
        orderTime: parseISO(trip["Zeitpunkt der Fahrtbestellung"]),
        tripStatus: trip["Fahrtstatus"],
        rawData: trip,
      }));

      const total = dbTrips.length;
      const expressSessionId = req.sessionID!;
      progressBroker.broadcast(expressSessionId, {
        phase: "trips",
        total,
        processed: 0,
        percent: 0,
        message: "Fahrten werden gespeichert...",
      });

      await storage.createTrips(dbTrips, (processed, totalCount) => {
        const percent = Math.round((processed / totalCount) * 100);
        progressBroker.broadcast(expressSessionId, {
          phase: "trips",
          total: totalCount,
          processed,
          percent,
          message: "Fahrten werden gespeichert...",
        });
      });

      progressBroker.broadcast(expressSessionId, {
        phase: "trips",
        total,
        processed: total,
        percent: 100,
        message: "Fahrten erfolgreich gespeichert!",
      });

      await storage.updateSessionActivity(sessionId, 2);

      res.json({ success: true, added: validTrips.length });
    } catch (error: any) {
      console.error("Error uploading trips:", error);
      const errorMessage = error?.message || "Unbekannter Fehler beim Speichern der Fahrten";
      res.status(500).json({ error: `Fehler beim Speichern der Fahrten: ${errorMessage}` });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { transactions } = req.body;

      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Invalid transactions data" });
      }

      const parseEuroAmountLocal = (value: any): number | null => {
        if (value === undefined || value === null || value === '') return null;
        const numVal = typeof value === 'string' 
          ? parseFloat(value.replace(',', '.')) 
          : value;
        return isNaN(numVal) ? null : Math.round(numVal * 100);
      };

      // Filter out invalid transactions and same-batch duplicates only
      // Database handles session-level duplicates via ON CONFLICT DO NOTHING
      const seenKeys = new Set<string>();
      const newTransactions = transactions.filter((tx: any) => {
        let amount: number;
        if (tx["An dein Unternehmen gezahlt"] !== undefined) {
          amount = typeof tx["An dein Unternehmen gezahlt"] === 'string' 
            ? parseFloat(tx["An dein Unternehmen gezahlt"].replace(',', '.')) 
            : tx["An dein Unternehmen gezahlt"];
        } else {
          amount = typeof tx["Betrag"] === 'string' 
            ? parseFloat(tx["Betrag"].replace(',', '.')) 
            : tx["Betrag"];
        }
        
        let timestamp: Date;
        if (tx["vs-Berichterstattung"]) {
          timestamp = parsePaymentTimestamp(tx["vs-Berichterstattung"]);
        } else if (tx["Zeitpunkt"]) {
          timestamp = parsePaymentTimestamp(tx["Zeitpunkt"]);
        } else {
          return false;
        }
        
        if (!timestamp || isNaN(timestamp.getTime())) {
          return false;
        }
        
        let licensePlate = tx["Kennzeichen"];
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = extractLicensePlate(tx["Beschreibung"]);
        }
        
        const amountCents = Math.round(amount * 100);
        const key = `${(licensePlate || '').trim()}-${timestamp.getTime()}-${amountCents}`;
        if (seenKeys.has(key)) {
          return false;
        }
        seenKeys.add(key);
        return true;
      });

      const dbTransactions = newTransactions.map((tx: any) => {
        let amount: number;
        if (tx["An dein Unternehmen gezahlt"] !== undefined) {
          amount = typeof tx["An dein Unternehmen gezahlt"] === 'string' 
            ? parseFloat(tx["An dein Unternehmen gezahlt"].replace(',', '.')) 
            : tx["An dein Unternehmen gezahlt"];
        } else {
          amount = typeof tx["Betrag"] === 'string' 
            ? parseFloat(tx["Betrag"].replace(',', '.')) 
            : tx["Betrag"];
        }
        
        let timestamp: Date;
        if (tx["vs-Berichterstattung"]) {
          timestamp = parsePaymentTimestamp(tx["vs-Berichterstattung"]);
        } else if (tx["Zeitpunkt"]) {
          timestamp = parsePaymentTimestamp(tx["Zeitpunkt"]);
        } else {
          timestamp = new Date();
        }
        
        let licensePlate = tx["Kennzeichen"];
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = extractLicensePlate(tx["Beschreibung"]);
        }
        
        const tripUuid = tx["Fahrt-UUID"] || null;
        // Support both column formats: with spaces around colons and without
        // Also support the already-extracted fields from client-side processing
        const revenue = parseEuroAmountLocal(
          tx["An dein Unternehmen gezahlt : Deine Umsätze"] || 
          tx["An dein Unternehmen gezahlt:Deine Umsätze"] ||
          tx["revenue"]
        );
        const farePrice = parseEuroAmountLocal(
          tx["An dein Unternehmen gezahlt : Deine Umsätze : Fahrpreis"] || 
          tx["An dein Unternehmen gezahlt:Deine Umsätze:Fahrpreis"] ||
          tx["farePrice"]
        );
        
        return {
          sessionId,
          licensePlate: licensePlate || "",
          transactionTime: timestamp,
          amount: Math.round(amount * 100),
          description: tx["Beschreibung"] || null,
          tripUuid,
          revenue,
          farePrice,
          rawData: tx,
        };
      }).filter((tx: any) => tx.licensePlate || tx.tripUuid);

      const total = dbTransactions.length;
      const expressSessionId = req.sessionID!;
      progressBroker.broadcast(expressSessionId, {
        phase: "transactions",
        total,
        processed: 0,
        percent: 0,
        message: "Zahlungen werden gespeichert...",
      });

      await storage.createTransactions(dbTransactions, (processed, totalCount) => {
        const percent = Math.round((processed / totalCount) * 100);
        progressBroker.broadcast(expressSessionId, {
          phase: "transactions",
          total: totalCount,
          processed,
          percent,
          message: "Zahlungen werden gespeichert...",
        });
      });

      // Extract company name from first transaction with "Name des Unternehmens" or "Firmenname"
      const firstTxWithCompany = transactions.find((tx: any) => 
        tx["Name des Unternehmens"] || tx["Firmenname"]
      );
      if (firstTxWithCompany) {
        const companyName = firstTxWithCompany["Name des Unternehmens"] || firstTxWithCompany["Firmenname"];
        if (companyName) {
          await storage.updateCompanyName(sessionId, companyName);
        }
      }

      progressBroker.broadcast(expressSessionId, {
        phase: "transactions",
        total,
        processed: total,
        percent: 100,
        message: "Zahlungen erfolgreich gespeichert!",
      });

      res.json({ success: true, added: dbTransactions.length });
    } catch (error: any) {
      console.error("Error uploading transactions:", error);
      const errorMessage = error?.message || "Unbekannter Fehler beim Speichern der Zahlungen";
      res.status(500).json({ error: `Fehler beim Speichern der Zahlungen: ${errorMessage}` });
    }
  });

  app.post("/api/upload", upload.array("files", 100), async (req, res) => {
    const startTime = Date.now();
    // Create session ID only when actually importing data
    const sessionId = ensureSessionId(req);
    
    // Save the session to persist the new session ID
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    const logger = createImportLogger(sessionId);
    
    try {
      const expressSessionId = req.sessionID!;
      const files = req.files as Express.Multer.File[];

      logger.startPhase('upload');
      logger.memory('upload', 'Start');
      logger.info(`Upload started: ${files?.length || 0} files (streaming mode)`, 'upload', {
        fileCount: files?.length || 0,
        totalSize: files?.reduce((sum, f) => sum + f.size, 0) || 0,
      });

      if (!files || files.length === 0) {
        logger.warn('No files uploaded', 'upload');
        return res.status(400).json({ error: "Keine Dateien hochgeladen" });
      }

      progressBroker.broadcast(expressSessionId, {
        phase: "parsing",
        total: files.length,
        processed: 0,
        percent: 0,
        message: "Dateien werden analysiert...",
      });

      const tripFiles: { file: Express.Multer.File; platform: Platform }[] = [];
      const paymentFiles: { file: Express.Multer.File; platform: Platform }[] = [];
      const campaignFiles: { file: Express.Multer.File; platform: Platform }[] = [];
      const unclassifiedFiles: Express.Multer.File[] = [];

      for (const file of files) {
        const content = file.buffer.toString("utf-8");
        const firstLine = content.split("\n")[0] || "";

        const classification = classifyFile(firstLine);
        if (!classification) {
          unclassifiedFiles.push(file);
          continue;
        }

        switch (classification.fileType) {
          case 'trips':
            tripFiles.push({ file, platform: classification.platform });
            break;
          case 'payments':
            paymentFiles.push({ file, platform: classification.platform });
            break;
          case 'campaign':
            campaignFiles.push({ file, platform: classification.platform });
            break;
          default:
            // shifts, driver_performance, vehicle_performance – store as upload only
            unclassifiedFiles.push(file);
            break;
        }
      }

      logger.endPhase('upload', files.length);
      const platforms = [...new Set([
        ...tripFiles.map(f => f.platform),
        ...paymentFiles.map(f => f.platform),
        ...campaignFiles.map(f => f.platform),
      ])];
      logger.info(`Classified files: ${tripFiles.length} trip files, ${paymentFiles.length} payment files, ${campaignFiles.length} campaign files (platforms: ${platforms.join(', ')})`, 'upload');

      const seenTripKeys = new Set<string>();
      const seenTxKeys = new Set<string>();
      let totalTripsProcessed = 0;
      let totalTransactionsProcessed = 0;
      let companyName: string | undefined;
      let globalMinDate: Date | undefined;
      let globalMaxDate: Date | undefined;

      logger.startPhase('parse');
      logger.memory('parse', 'Before streaming processing');

      progressBroker.broadcast(expressSessionId, {
        phase: "processing",
        total: files.length,
        processed: 0,
        percent: 10,
        message: "Fahrten werden verarbeitet (Streaming)...",
      });

      for (let i = 0; i < tripFiles.length; i++) {
        const { file, platform } = tripFiles[i];
        logger.info(`Processing ${platform} trip file ${i + 1}/${tripFiles.length}: ${file.originalname}`, 'parse');

        const processFn = platform === 'bolt' ? processBoltTripFileStreaming : processTripFileStreaming;
        const result = await processFn(
          file,
          sessionId,
          seenTripKeys,
          async (batch) => {
            await storage.createTrips(batch);
            totalTripsProcessed += batch.length;
            progressBroker.broadcast(expressSessionId, {
              phase: "saving_trips",
              total: totalTripsProcessed,
              processed: totalTripsProcessed,
              percent: 10 + Math.round(((i + 0.5) / tripFiles.length) * 30),
              message: `${platform === 'bolt' ? 'Bolt' : 'Uber'} Fahrten speichern: ${totalTripsProcessed} verarbeitet`,
            });
          }
        );

        if (result.dateRange) {
          if (!globalMinDate || result.dateRange.minDate < globalMinDate) {
            globalMinDate = result.dateRange.minDate;
          }
          if (!globalMaxDate || result.dateRange.maxDate > globalMaxDate) {
            globalMaxDate = result.dateRange.maxDate;
          }
        }
      }

      logger.memory('parse', 'After trip processing');
      logger.info(`Trip processing complete: ${totalTripsProcessed} trips`, 'parse');

      progressBroker.broadcast(expressSessionId, {
        phase: "processing",
        total: files.length,
        processed: tripFiles.length,
        percent: 50,
        message: "Zahlungen werden verarbeitet (Streaming)...",
      });

      const totalPaymentAndCampaignFiles = paymentFiles.length + campaignFiles.length;

      for (let i = 0; i < paymentFiles.length; i++) {
        const { file, platform } = paymentFiles[i];
        logger.info(`Processing ${platform} payment file ${i + 1}/${paymentFiles.length}: ${file.originalname}`, 'parse');

        const processFn = platform === 'bolt' ? processBoltFinancialFileStreaming : processPaymentFileStreaming;
        const result = await processFn(
          file,
          sessionId,
          seenTxKeys,
          async (batch) => {
            await storage.createTransactions(batch);
            totalTransactionsProcessed += batch.length;
            progressBroker.broadcast(expressSessionId, {
              phase: "saving_transactions",
              total: totalTransactionsProcessed,
              processed: totalTransactionsProcessed,
              percent: 50 + Math.round(((i + 0.5) / totalPaymentAndCampaignFiles) * 40),
              message: `${platform === 'bolt' ? 'Bolt' : 'Uber'} Zahlungen speichern: ${totalTransactionsProcessed} verarbeitet`,
            });
          }
        );

        if (result.companyName && !companyName) {
          companyName = result.companyName;
        }
      }

      // Process Bolt campaign files
      for (let i = 0; i < campaignFiles.length; i++) {
        const { file, platform } = campaignFiles[i];
        logger.info(`Processing ${platform} campaign file ${i + 1}/${campaignFiles.length}: ${file.originalname}`, 'parse');

        const result = await processBoltCampaignFileStreaming(
          file,
          sessionId,
          seenTxKeys,
          async (batch) => {
            await storage.createTransactions(batch);
            totalTransactionsProcessed += batch.length;
            progressBroker.broadcast(expressSessionId, {
              phase: "saving_transactions",
              total: totalTransactionsProcessed,
              processed: totalTransactionsProcessed,
              percent: 50 + Math.round(((paymentFiles.length + i + 0.5) / totalPaymentAndCampaignFiles) * 40),
              message: `Bolt Kampagnen speichern: ${totalTransactionsProcessed} verarbeitet`,
            });
          }
        );
      }

      // Lazy cross-reference: link Bolt financial/campaign transactions to license plates from Bolt trips
      if (tripFiles.some(f => f.platform === 'bolt') || paymentFiles.some(f => f.platform === 'bolt') || campaignFiles.length > 0) {
        await storage.crossReferenceBoltTransactions(sessionId);
      }

      logger.endPhase('parse', totalTripsProcessed + totalTransactionsProcessed);
      logger.memory('parse', 'After all streaming processing');
      logger.info(`Streaming processing complete: ${totalTripsProcessed} trips, ${totalTransactionsProcessed} transactions`, 'parse');

      if (companyName) {
        await storage.updateCompanyName(sessionId, companyName);
      }

      for (const file of files) {
        // Determine file type and platform for upload record
        const tripEntry = tripFiles.find(f => f.file === file);
        const paymentEntry = paymentFiles.find(f => f.file === file);
        const campaignEntry = campaignFiles.find(f => f.file === file);
        const fileType = tripEntry ? "trips" : campaignEntry ? "campaign" : "payments";
        const filePlatform = tripEntry?.platform || paymentEntry?.platform || campaignEntry?.platform || 'uber';

        await storage.createUpload({
          sessionId,
          filename: file.originalname,
          fileType,
          mimeType: file.mimetype || "text/csv",
          size: file.size,
          content: file.buffer.toString("base64"),
          platform: filePlatform,
        });
      }

      let vorgangsId = null;
      if (totalTripsProcessed > 0 || totalTransactionsProcessed > 0) {
        // Ensure session exists in DB before generating VorgangsId
        await storage.getOrCreateSession(sessionId);
        vorgangsId = await storage.generateVorgangsId(sessionId);
        await storage.updateSessionActivity(sessionId, 2);
      }

      let dateRange: { from: string; to: string } | undefined;
      if (globalMinDate && globalMaxDate) {
        dateRange = {
          from: globalMinDate.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }),
          to: globalMaxDate.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }),
        };
      }

      logger.setVorgangsId(vorgangsId || '');
      
      progressBroker.broadcast(expressSessionId, {
        phase: "complete",
        total: totalTripsProcessed + totalTransactionsProcessed,
        processed: totalTripsProcessed + totalTransactionsProcessed,
        percent: 100,
        message: "Upload abgeschlossen!",
      });

      const durationMs = Date.now() - startTime;
      logger.complete(totalTripsProcessed, totalTransactionsProcessed);
      const totalRecords = totalTripsProcessed + totalTransactionsProcessed;
      const recordsPerSecond = durationMs > 0 ? Math.round((totalRecords / durationMs) * 1000) : 0;
      
      try {
        await storage.createPerformanceLog({
          vorgangsId,
          operationType: "import",
          softwareVersion: SOFTWARE_VERSION,
          durationMs,
          tripCount: totalTripsProcessed,
          transactionCount: totalTransactionsProcessed,
          recordsPerSecond,
        });
      } catch (logError) {
        console.error("Failed to log performance metrics:", logError);
      }

      res.json({
        success: true,
        vorgangsId,
        tripsAdded: totalTripsProcessed,
        transactionsAdded: totalTransactionsProcessed,
        filesProcessed: files.length,
        dateRange,
      });
    } catch (error: any) {
      logger.error(`Upload failed: ${error?.message || 'Unknown error'}`, 'error', error);
      logger.memory('error', 'At error');
      console.error("Error in file upload:", error);
      res.status(500).json({ error: `Fehler beim Upload: ${error?.message || "Unbekannter Fehler"}` });
    }
  });

  app.post("/api/session/reset", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      await storage.deleteTripsForSession(sessionId);
      await storage.deleteTransactionsForSession(sessionId);
      await storage.clearVorgangsId(sessionId);
      await storage.updateSessionActivity(sessionId, 1);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting session:", error);
      res.status(500).json({ error: "Failed to reset session" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminPassword) {
        return res.status(500).json({ error: "Admin password not configured" });
      }
      
      if (password === adminPassword) {
        req.session.isAdmin = true;
        req.session.save((err) => {
          if (err) {
            console.error("Error saving admin session:", err);
            return res.status(500).json({ error: "Session save failed" });
          }
          res.json({ success: true });
        });
      } else {
        res.status(401).json({ error: "Falsches Passwort" });
      }
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/admin/check", async (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });

  app.get("/api/admin/performance-logs", async (req, res) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
    try {
      const logs = await storage.getPerformanceLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching performance logs:", error);
      res.status(500).json({ error: "Failed to fetch performance logs" });
    }
  });

  app.get("/api/admin/import-logs", async (req, res) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
    try {
      const { sessionId, vorgangsId, limit } = req.query;
      let logs;
      if (sessionId) {
        logs = await storage.getImportLogsBySession(sessionId as string);
      } else if (vorgangsId) {
        logs = await storage.getImportLogsByVorgangsId(vorgangsId as string);
      } else {
        logs = await storage.getRecentImportLogs(limit ? parseInt(limit as string) : 100);
      }
      res.json(logs);
    } catch (error) {
      console.error("Error fetching import logs:", error);
      res.status(500).json({ error: "Failed to fetch import logs" });
    }
  });

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.session.isAdmin) {
      return res.status(401).json({ error: "Nicht autorisiert" });
    }
    next();
  };

  app.get("/api/admin/sessions", requireAdmin, async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      
      const sessionsWithCounts = await Promise.all(
        sessions.map(async (session) => {
          const [tripCount, transactionCount, uploadCount, lastPerformanceLog] = await Promise.all([
            storage.getTripCountBySession(session.sessionId),
            storage.getTransactionCountBySession(session.sessionId),
            storage.getUploadCountBySession(session.sessionId),
            session.vorgangsId ? storage.getLatestPerformanceLogByVorgangsId(session.vorgangsId) : Promise.resolve(null),
          ]);
          
          return {
            ...session,
            tripCount,
            transactionCount,
            uploadCount,
            lastPerformanceLog,
          };
        })
      );

      res.json(sessionsWithCounts);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/admin/sessions/:sessionId", requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await storage.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      // Get aggregated stats and performance logs
      const [stats, performanceLogs] = await Promise.all([
        storage.getSessionStats(sessionId),
        session.vorgangsId ? storage.getPerformanceLogsByVorgangsId(session.vorgangsId) : Promise.resolve([]),
      ]);
      
      res.json({
        session,
        stats,
        performanceLogs,
      });
    } catch (error) {
      console.error("Error fetching session details:", error);
      res.status(500).json({ error: "Failed to fetch session details" });
    }
  });

  app.delete("/api/admin/sessions/:sessionId", requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.deleteSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  app.post("/api/admin/sessions/bulk-delete", requireAdmin, async (req, res) => {
    try {
      const { sessionIds } = req.body;
      if (!Array.isArray(sessionIds)) {
        return res.status(400).json({ error: "sessionIds must be an array" });
      }
      
      for (const sessionId of sessionIds) {
        await storage.deleteSession(sessionId);
      }
      
      res.json({ success: true, deleted: sessionIds.length });
    } catch (error) {
      console.error("Error bulk deleting sessions:", error);
      res.status(500).json({ error: "Failed to delete sessions" });
    }
  });

  // Reprocess session data from stored CSV files
  app.post("/api/admin/sessions/:sessionId/reprocess", requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      // Get stored uploads
      const uploads = await storage.getUploadsBySession(sessionId);
      if (uploads.length === 0) {
        return res.status(400).json({ error: "Keine gespeicherten Dateien gefunden" });
      }
      
      // Delete existing trips and transactions
      await storage.deleteTripsForSession(sessionId);
      await storage.deleteTransactionsForSession(sessionId);
      
      let tripsAdded = 0;
      let transactionsAdded = 0;
      
      for (const upload of uploads) {
        // Decode base64 content
        const content = Buffer.from(upload.content, 'base64').toString('utf-8');
        
        // Parse CSV
        const parsed = await new Promise<any[]>((resolve, reject) => {
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error: any) => reject(error),
          });
        });
        
        if (upload.fileType === 'trips') {
          // Process trips
          const validTrips = parsed.filter((row: any) => {
            const tripStatus = row["Fahrtstatus"];
            const timestamp = row["Zeitpunkt der Fahrtbestellung"];
            const licensePlate = row["Kennzeichen"];
            return tripStatus && timestamp && licensePlate;
          });
          
          const dbTrips = validTrips.map((row: any) => ({
            sessionId,
            licensePlate: row["Kennzeichen"] || "",
            orderTime: parseISO(row["Zeitpunkt der Fahrtbestellung"]),
            tripStatus: row["Fahrtstatus"],
            tripId: row["Fahrt-ID"] || null,
            rawData: row,
          }));
          
          if (dbTrips.length > 0) {
            await storage.createTrips(dbTrips);
            tripsAdded += dbTrips.length;
          }
        } else if (upload.fileType === 'payments') {
          // Process payments
          const validTransactions = parsed.filter((tx: any) => {
            const hasTimestamp = tx["vs-Berichterstattung"] || tx["Zeitpunkt"];
            const hasAmount = tx["An dein Unternehmen gezahlt"] !== undefined || tx["Betrag"] !== undefined;
            return hasTimestamp && hasAmount;
          });
          
          const dbTransactions = validTransactions.map((tx: any) => {
            let amount: number;
            if (tx["An dein Unternehmen gezahlt"] !== undefined) {
              amount = typeof tx["An dein Unternehmen gezahlt"] === 'string'
                ? parseFloat(tx["An dein Unternehmen gezahlt"].replace(',', '.'))
                : tx["An dein Unternehmen gezahlt"];
            } else {
              amount = typeof tx["Betrag"] === 'string'
                ? parseFloat(tx["Betrag"].replace(',', '.'))
                : tx["Betrag"];
            }
            
            let timestamp: Date;
            if (tx["vs-Berichterstattung"]) {
              timestamp = parsePaymentTimestamp(tx["vs-Berichterstattung"]);
            } else {
              timestamp = parsePaymentTimestamp(tx["Zeitpunkt"]);
            }
            
            let licensePlate = tx["Kennzeichen"] || "";
            if (!licensePlate && tx["Beschreibung"]) {
              licensePlate = extractLicensePlate(tx["Beschreibung"]) || "";
            }
            
            return {
              sessionId,
              licensePlate,
              transactionTime: timestamp,
              amount: Math.round(amount * 100),
              description: tx["Beschreibung"] || null,
              tripUuid: tx["Fahrt-UUID"] || null,
              rawData: tx,
            };
          });
          
          if (dbTransactions.length > 0) {
            await storage.createTransactions(dbTransactions);
            transactionsAdded += dbTransactions.length;
          }
        }
      }
      
      res.json({ 
        success: true, 
        tripsAdded, 
        transactionsAdded,
        filesProcessed: uploads.length 
      });
    } catch (error) {
      console.error("Error reprocessing session:", error);
      res.status(500).json({ error: "Fehler beim Neu-Einlesen der Daten" });
    }
  });

  // Upload file storage endpoint
  app.post("/api/uploads", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { files } = req.body;

      if (!Array.isArray(files)) {
        return res.status(400).json({ error: "Invalid files data" });
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const results = [];

      for (const file of files) {
        if (!file.filename || !file.content || !file.fileType) {
          continue;
        }

        // Validate size (base64 is ~33% larger than original)
        const estimatedSize = Math.ceil(file.content.length * 0.75);
        if (estimatedSize > MAX_FILE_SIZE) {
          return res.status(400).json({ 
            error: `File ${file.filename} exceeds maximum size of 10MB` 
          });
        }

        const upload = await storage.createUpload({
          sessionId,
          fileType: file.fileType,
          filename: file.filename,
          mimeType: file.mimeType || "text/csv",
          size: estimatedSize,
          content: file.content,
        });

        results.push({
          id: upload.id,
          filename: upload.filename,
          fileType: upload.fileType,
          size: upload.size,
        });
      }

      res.json({ success: true, uploads: results });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ error: "Failed to upload files" });
    }
  });

  // Admin: Get uploads for a session
  app.get("/api/admin/sessions/:sessionId/uploads", requireAdmin, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const uploads = await storage.getUploadsBySession(sessionId);
      
      // Return metadata only, not content
      const uploadMetadata = uploads.map(u => ({
        id: u.id,
        fileType: u.fileType,
        filename: u.filename,
        mimeType: u.mimeType,
        size: u.size,
        createdAt: u.createdAt,
      }));

      res.json({ uploads: uploadMetadata });
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ error: "Failed to fetch uploads" });
    }
  });

  // Admin: Download a specific upload
  app.get("/api/admin/uploads/:uploadId/download", requireAdmin, async (req, res) => {
    try {
      const { uploadId } = req.params;
      const upload = await storage.getUploadById(uploadId);

      if (!upload) {
        return res.status(404).json({ error: "Upload not found" });
      }

      // Decode base64 content
      const buffer = Buffer.from(upload.content, "base64");

      res.setHeader("Content-Type", upload.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${upload.filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading upload:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Performance Dashboard API Routes
  const parseDateParam = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      const parsed = parseISO(dateStr);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } catch {
      return undefined;
    }
  };

  const parseEndDateParam = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      const parsed = parseISO(dateStr);
      if (isNaN(parsed.getTime())) return undefined;
      // Set to end of day (23:59:59.999) to include all records on the last day
      parsed.setHours(23, 59, 59, 999);
      return parsed;
    } catch {
      return undefined;
    }
  };

  const validateSession = async (req: any, res: any): Promise<string | null> => {
    const sessionId = req.session.uberRetterSessionId;
    if (!sessionId) {
      res.status(401).json({ error: "Keine aktive Sitzung" });
      return null;
    }
    
    const session = await storage.getSessionById(sessionId);
    if (!session) {
      res.status(404).json({ error: "Sitzung nicht gefunden" });
      return null;
    }
    
    return sessionId;
  };

  app.get("/api/performance/daterange", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const dateRange = await storage.getDataDateRange(sessionId);
      
      res.json(dateRange);
    } catch (error) {
      console.error("Error fetching date range:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Datumsbereichs" });
    }
  });

  app.get("/api/performance/kpis", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const metrics = await storage.getPerformanceMetrics(sessionId, startDate, endDate);
      
      res.json({
        totals: metrics.totals,
        byDay: metrics.byDay,
        byMonth: metrics.byMonth,
      });
    } catch (error) {
      console.error("Error fetching KPIs:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der KPIs" });
    }
  });

  app.get("/api/performance/drivers", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const [metrics, shiftAnalysis] = await Promise.all([
        storage.getPerformanceMetrics(sessionId, startDate, endDate),
        storage.getShiftAnalysis(sessionId, startDate, endDate),
      ]);
      
      const shiftCountByDriver: Record<string, number> = {};
      for (const shift of shiftAnalysis.shifts) {
        const driverName = shift.driverName || 'Unbekannt';
        shiftCountByDriver[driverName] = (shiftCountByDriver[driverName] || 0) + 1;
      }
      
      const driversWithShifts = metrics.byDriver.map(driver => ({
        ...driver,
        shiftCount: shiftCountByDriver[driver.driverName] || 0,
      }));
      
      res.json({
        drivers: driversWithShifts,
        totals: metrics.totals,
      });
    } catch (error) {
      console.error("Error fetching driver metrics:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Fahrer-Statistiken" });
    }
  });

  app.get("/api/performance/vehicles", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const metrics = await storage.getPerformanceMetrics(sessionId, startDate, endDate);
      
      res.json({
        vehicles: metrics.byVehicle,
        totals: metrics.totals,
      });
    } catch (error) {
      console.error("Error fetching vehicle metrics:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Fahrzeug-Statistiken" });
    }
  });

  app.get("/api/performance/shifts", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const analysis = await storage.getShiftAnalysis(sessionId, startDate, endDate);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching shift analysis:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Schicht-Analyse" });
    }
  });

  app.get("/api/performance/commissions", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const analysis = await storage.getCommissionAnalysis(sessionId, startDate, endDate);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching commission analysis:", error);
      res.status(500).json({ error: "Fehler beim Abrufen der Commission-Analyse" });
    }
  });

  app.get("/api/reports/drivers", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const report = await storage.getDriverReport(sessionId, startDate, endDate);
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching driver report:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Fahrerberichts" });
    }
  });

  app.get("/api/reports/vehicles", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const startDate = parseDateParam(req.query.startDate as string);
      const endDate = parseEndDateParam(req.query.endDate as string);

      const report = await storage.getVehicleReport(sessionId, startDate, endDate);
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching vehicle report:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Fahrzeugberichts" });
    }
  });

  app.get("/api/reports/promo", async (req, res) => {
    try {
      const sessionId = await validateSession(req, res);
      if (!sessionId) return;

      const report = await storage.getPromoReport(sessionId);
      
      res.json(report);
    } catch (error) {
      console.error("Error fetching promo report:", error);
      res.status(500).json({ error: "Fehler beim Abrufen des Werbegelder-Berichts" });
    }
  });

  return httpServer;
}
