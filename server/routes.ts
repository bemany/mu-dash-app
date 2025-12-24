import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { progressBroker } from "./progress-broker";
import { z } from "zod";
import { parseISO, parse } from "date-fns";
import multer from "multer";
import Papa from "papaparse";

const SOFTWARE_VERSION = "1.0.0";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.use((req, res, next) => {
    if (!req.session.uberRetterSessionId) {
      req.session.uberRetterSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
  });

  app.get("/api/session", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const session = await storage.getOrCreateSession(sessionId);
      
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
      const transactions = await storage.getTransactionsBySession(sessionId);

      const frontendTransactions = transactions.map(tx => ({
        "Kennzeichen": tx.licensePlate,
        "Zeitpunkt": tx.transactionTime.toISOString(),
        "Betrag": tx.amount / 100,
        "Beschreibung": tx.description || undefined,
        ...tx.rawData as any,
      }));

      res.json({
        sessionId,
        vorgangsId,
        companyName: session.companyName,
        currentStep: session.currentStep,
        tripCount,
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
    try {
      const { vorgangsId } = req.body;
      
      if (!vorgangsId || typeof vorgangsId !== "string") {
        return res.status(400).json({ error: "Vorgangs-ID erforderlich" });
      }

      const normalizedId = vorgangsId.trim().toUpperCase();
      const session = await storage.getSessionByVorgangsId(normalizedId);
      
      if (!session) {
        return res.status(404).json({ error: "Keine Session mit dieser Vorgangs-ID gefunden" });
      }

      // Use count instead of loading all trips
      const tripCount = await storage.getTripCountBySession(session.sessionId);
      
      if (tripCount === 0) {
        return res.status(404).json({ error: "Dieser Vorgang enthält keine Daten mehr" });
      }

      const transactionCount = await storage.getTransactionCountBySession(session.sessionId);

      req.session.uberRetterSessionId = session.sessionId;
      
      if (session.currentStep === 1 && tripCount > 0) {
        const newStep = transactionCount > 0 ? 3 : 2;
        await storage.updateSessionActivity(session.sessionId, newStep);
      }

      // Log performance
      const durationMs = Date.now() - startTime;
      const totalRecords = tripCount + transactionCount;
      const recordsPerSecond = durationMs > 0 ? Math.round((totalRecords / durationMs) * 1000) : 0;
      
      await storage.createPerformanceLog({
        vorgangsId: normalizedId,
        operationType: "load",
        softwareVersion: SOFTWARE_VERSION,
        durationMs,
        tripCount,
        transactionCount,
        recordsPerSecond,
      });
      
      res.json({ success: true, sessionId: session.sessionId });
    } catch (error) {
      console.error("Error loading session:", error);
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
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const expressSessionId = req.sessionID!;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Keine Dateien hochgeladen" });
      }

      progressBroker.broadcast(expressSessionId, {
        phase: "parsing",
        total: files.length,
        processed: 0,
        percent: 0,
        message: "Dateien werden analysiert...",
      });

      const tripFiles: Express.Multer.File[] = [];
      const paymentFiles: Express.Multer.File[] = [];

      for (const file of files) {
        const content = file.buffer.toString("utf-8");
        const firstLine = content.split("\n")[0] || "";
        
        if (firstLine.includes("Kennzeichen") && firstLine.includes("Zeitpunkt der Fahrtbestellung")) {
          tripFiles.push(file);
        } else if (firstLine.includes("Beschreibung") || firstLine.includes("An dein Unternehmen gezahlt")) {
          paymentFiles.push(file);
        }
      }

      // Deduplication now handled by database unique indexes (ON CONFLICT DO NOTHING)
      // This avoids loading all existing data into memory for large datasets
      const seenTripKeys = new Set<string>();
      const seenTxKeys = new Set<string>();

      const parseFile = (file: Express.Multer.File): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          const content = file.buffer.toString("utf-8");
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error: any) => reject(error),
          });
        });
      };

      progressBroker.broadcast(expressSessionId, {
        phase: "parsing",
        total: files.length,
        processed: 0,
        percent: 10,
        message: "CSV-Dateien werden parallel verarbeitet...",
      });

      const [tripDataArrays, paymentDataArrays] = await Promise.all([
        Promise.all(tripFiles.map(parseFile)),
        Promise.all(paymentFiles.map(parseFile)),
      ]);

      const allTripData = tripDataArrays.flat();
      const allPaymentData = paymentDataArrays.flat();

      progressBroker.broadcast(expressSessionId, {
        phase: "processing",
        total: allTripData.length + allPaymentData.length,
        processed: 0,
        percent: 20,
        message: "Daten werden verarbeitet...",
      });

      // Import ALL trips (including cancelled) for acceptance rate analysis
      // Deduplication handled by database - here we just filter out invalid data and same-batch duplicates
      const validTrips = allTripData.filter((trip: any) => {
        if (!trip["Kennzeichen"] || !trip["Zeitpunkt der Fahrtbestellung"]) return false;
        if (!trip["Fahrtstatus"]) return false; // Must have status
        const orderTime = parseISO(trip["Zeitpunkt der Fahrtbestellung"]);
        if (!orderTime || isNaN(orderTime.getTime())) return false;
        // Normalize license plate (trim whitespace) for deduplication
        const licensePlate = trip["Kennzeichen"].toString().trim();
        // Only check for same-batch duplicates (db handles existing data duplicates)
        const key = `${licensePlate}-${orderTime.getTime()}`;
        if (seenTripKeys.has(key)) return false;
        seenTripKeys.add(key);
        return true;
      });

      const dbTrips = validTrips.map((trip: any) => ({
        sessionId,
        tripId: trip["Fahrt-ID"] ? trip["Fahrt-ID"].toString().trim() : null,
        licensePlate: trip["Kennzeichen"].toString().trim(),
        orderTime: parseISO(trip["Zeitpunkt der Fahrtbestellung"]),
        tripStatus: trip["Fahrtstatus"].toString().trim(),
        rawData: trip,
      }));

      // Debug: Count total payments before filtering
      console.log("[DEBUG] Total payment rows parsed:", allPaymentData.length);
      if (allPaymentData.length > 0) {
        console.log("[DEBUG] First payment row keys:", Object.keys(allPaymentData[0]));
        console.log("[DEBUG] First payment Fahrt-UUID:", allPaymentData[0]["Fahrt-UUID"]);
        console.log("[DEBUG] First payment vs-Berichterstattung:", allPaymentData[0]["vs-Berichterstattung"]);
      }

      // Deduplication handled by database - here we just filter out invalid data and same-batch duplicates
      const validTransactions = allPaymentData.filter((tx: any) => {
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

        if (isNaN(timestamp.getTime())) return false;

        // Check for direct Kennzeichen column first, then extract from Beschreibung
        let licensePlate = tx["Kennzeichen"] ? tx["Kennzeichen"].toString().trim() : null;
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = extractLicensePlate(tx["Beschreibung"]);
        }
        
        // Import ALL payments - no filter on license plate or tripUuid
        const amountCents = Math.round(amount * 100);
        // Normalize license plate for deduplication
        const normalizedPlate = licensePlate ? licensePlate.trim() : 'unknown';
        // Only check for same-batch duplicates (db handles existing data duplicates)
        const key = `${normalizedPlate}-${timestamp.getTime()}-${amountCents}`;
        if (seenTxKeys.has(key)) return false;
        seenTxKeys.add(key);
        return true;
      });

      console.log("[DEBUG] Valid transactions after filter:", validTransactions.length);

      const parseEuroAmount = (value: any): number | null => {
        if (value === undefined || value === null || value === '') return null;
        const numVal = typeof value === 'string' 
          ? parseFloat(value.replace(',', '.')) 
          : value;
        return isNaN(numVal) ? null : Math.round(numVal * 100);
      };

      // Debug: Log first transaction's keys to see exact column names
      if (validTransactions.length > 0) {
        const firstTx = validTransactions[0];
        const keys = Object.keys(firstTx);
        console.log("[DEBUG] First transaction column names:", keys);
        console.log("[DEBUG] Columns containing 'Fahrpreis':", keys.filter(k => k.includes('Fahrpreis')));
        console.log("[DEBUG] Columns containing 'Umsätze':", keys.filter(k => k.includes('Umsätze')));
        console.log("[DEBUG] Sample Fahrpreis value:", firstTx["An dein Unternehmen gezahlt : Deine Umsätze : Fahrpreis"]);
      }

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

        // Check for direct Kennzeichen column first, then extract from Beschreibung
        // Normalize by trimming whitespace
        let licensePlate = tx["Kennzeichen"] ? tx["Kennzeichen"].toString().trim() : "";
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = (extractLicensePlate(tx["Beschreibung"]) || "").trim();
        }
        const tripUuid = tx["Fahrt-UUID"] ? tx["Fahrt-UUID"].toString().trim() : null;
        
        // Extract revenue and farePrice for trip-based transactions
        // Support both column formats: with spaces around colons and without
        // Also support the already-extracted fields from client-side processing
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

        return {
          sessionId,
          licensePlate,
          transactionTime: timestamp,
          amount: Math.round(amount * 100),
          description: tx["Beschreibung"] || null,
          tripUuid,
          revenue,
          farePrice,
          rawData: tx,
        };
      });

      progressBroker.broadcast(expressSessionId, {
        phase: "saving",
        total: dbTrips.length + dbTransactions.length,
        processed: 0,
        percent: 40,
        message: "Daten werden gespeichert...",
      });

      const saveResults = await Promise.all([
        dbTrips.length > 0 ? storage.createTrips(dbTrips, (processed, total) => {
          progressBroker.broadcast(expressSessionId, {
            phase: "saving_trips",
            total,
            processed,
            percent: 40 + Math.round((processed / total) * 30),
            message: `Fahrten speichern: ${processed}/${total}`,
          });
        }) : Promise.resolve([]),
        dbTransactions.length > 0 ? storage.createTransactions(dbTransactions, (processed, total) => {
          progressBroker.broadcast(expressSessionId, {
            phase: "saving_transactions",
            total,
            processed,
            percent: 70 + Math.round((processed / total) * 25),
            message: `Zahlungen speichern: ${processed}/${total}`,
          });
        }) : Promise.resolve([]),
      ]);

      const firstTxWithCompany = allPaymentData.find((tx: any) =>
        tx["Name des Unternehmens"] || tx["Firmenname"]
      );
      if (firstTxWithCompany) {
        const companyName = firstTxWithCompany["Name des Unternehmens"] || firstTxWithCompany["Firmenname"];
        if (companyName) {
          await storage.updateCompanyName(sessionId, companyName);
        }
      }

      for (const file of files) {
        await storage.createUpload({
          sessionId,
          filename: file.originalname,
          fileType: tripFiles.includes(file) ? "trips" : "payments",
          mimeType: file.mimetype || "text/csv",
          size: file.size,
          content: file.buffer.toString("base64"),
        });
      }

      let vorgangsId = null;
      if (dbTrips.length > 0 || dbTransactions.length > 0) {
        vorgangsId = await storage.generateVorgangsId(sessionId);
        await storage.updateSessionActivity(sessionId, 2);
      }

      // Calculate date range from trips
      let dateRange: { from: string; to: string } | undefined;
      if (dbTrips.length > 0) {
        const tripDates = dbTrips.map(t => t.orderTime.getTime()).filter(d => !isNaN(d));
        if (tripDates.length > 0) {
          const minDate = new Date(Math.min(...tripDates));
          const maxDate = new Date(Math.max(...tripDates));
          dateRange = {
            from: minDate.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }),
            to: maxDate.toLocaleDateString('de-DE', { month: '2-digit', year: 'numeric' }),
          };
        }
      }

      progressBroker.broadcast(expressSessionId, {
        phase: "complete",
        total: dbTrips.length + dbTransactions.length,
        processed: dbTrips.length + dbTransactions.length,
        percent: 100,
        message: "Upload abgeschlossen!",
      });

      // Log performance
      const durationMs = Date.now() - startTime;
      const totalRecords = dbTrips.length + dbTransactions.length;
      const recordsPerSecond = durationMs > 0 ? Math.round((totalRecords / durationMs) * 1000) : 0;
      
      await storage.createPerformanceLog({
        vorgangsId,
        operationType: "import",
        softwareVersion: SOFTWARE_VERSION,
        durationMs,
        tripCount: dbTrips.length,
        transactionCount: dbTransactions.length,
        recordsPerSecond,
      });

      res.json({
        success: true,
        vorgangsId,
        tripsAdded: dbTrips.length,
        transactionsAdded: dbTransactions.length,
        filesProcessed: files.length,
        dateRange,
      });
    } catch (error: any) {
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
        res.json({ success: true });
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
          const [tripCount, transactionCount, uploadCount] = await Promise.all([
            storage.getTripCountBySession(session.sessionId),
            storage.getTransactionCountBySession(session.sessionId),
            storage.getUploadCountBySession(session.sessionId),
          ]);
          
          return {
            ...session,
            tripCount,
            transactionCount,
            uploadCount,
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
      
      // Get aggregated stats instead of all raw data
      const stats = await storage.getSessionStats(sessionId);
      
      res.json({
        session,
        stats,
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
