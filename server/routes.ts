import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { parseISO, parse } from "date-fns";

const LICENSE_PLATE_REGEX = /[A-Z]{1,3}-[A-Z]{1,3}\s?\d{1,4}[A-Z]?/i;

function extractLicensePlate(description: string): string | null {
  const match = description.match(LICENSE_PLATE_REGEX);
  return match ? match[0].toUpperCase().replace(/\s/g, '') : null;
}

function parsePaymentTimestamp(timestamp: string): Date {
  const cleanTimestamp = timestamp.replace(/ \+\d{4} [A-Z]+$/, '').trim();
  try {
    return parse(cleanTimestamp, "yyyy-MM-dd HH:mm:ss.SSS", new Date());
  } catch {
    try {
      return parseISO(timestamp);
    } catch {
      return new Date();
    }
  }
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
      const trips = await storage.getTripsBySession(sessionId);
      const transactions = await storage.getTransactionsBySession(sessionId);

      const frontendTrips = trips.map(t => ({
        "Kennzeichen": t.licensePlate,
        "Zeitpunkt der Fahrtbestellung": t.orderTime.toISOString(),
        "Fahrtstatus": t.tripStatus,
        "Fahrt-ID": t.tripId || undefined,
        ...t.rawData as any,
      }));

      const frontendTransactions = transactions.map(tx => ({
        "Kennzeichen": tx.licensePlate,
        "Zeitpunkt": tx.transactionTime.toISOString(),
        "Betrag": tx.amount / 100,
        "Beschreibung": tx.description || undefined,
        ...tx.rawData as any,
      }));

      res.json({
        sessionId,
        currentStep: session.currentStep,
        trips: frontendTrips,
        transactions: frontendTransactions,
      });
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session data" });
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

      const existingTrips = await storage.getTripsBySession(sessionId);
      const existingIds = new Set(
        existingTrips.map(t => 
          t.tripId || `${t.licensePlate}-${t.orderTime.toISOString()}`
        )
      );

      // Filter out invalid trips and duplicates
      const validTrips = trips.filter((trip: any) => {
        // Must have required fields
        if (!trip["Kennzeichen"] || !trip["Zeitpunkt der Fahrtbestellung"]) {
          return false;
        }
        const id = trip["Fahrt-ID"] || `${trip["Kennzeichen"]}-${trip["Zeitpunkt der Fahrtbestellung"]}`;
        return !existingIds.has(id);
      });

      const dbTrips = validTrips.map((trip: any) => ({
        sessionId,
        tripId: trip["Fahrt-ID"] || null,
        licensePlate: trip["Kennzeichen"],
        orderTime: parseISO(trip["Zeitpunkt der Fahrtbestellung"]),
        tripStatus: trip["Fahrtstatus"],
        rawData: trip,
      }));

      await storage.createTrips(dbTrips);
      await storage.updateSessionActivity(sessionId, 2);

      res.json({ success: true, added: validTrips.length });
    } catch (error) {
      console.error("Error uploading trips:", error);
      res.status(500).json({ error: "Failed to upload trips" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { transactions } = req.body;

      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Invalid transactions data" });
      }

      const existingTransactions = await storage.getTransactionsBySession(sessionId);
      const existingKeys = new Set(
        existingTransactions.map(tx => 
          `${tx.licensePlate}-${tx.transactionTime.toISOString()}-${tx.amount}`
        )
      );

      const newTransactions = transactions.filter((tx: any) => {
        const amount = typeof tx["Betrag"] === 'string' 
          ? parseFloat(tx["Betrag"].replace(',', '.')) 
          : tx["Betrag"];
        
        let timestamp: string;
        if (tx["Zeitpunkt"]) {
          timestamp = tx["Zeitpunkt"];
        } else if (tx["vs-Berichterstattung"]) {
          timestamp = tx["vs-Berichterstattung"];
        } else {
          return false;
        }
        
        let licensePlate = tx["Kennzeichen"];
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = extractLicensePlate(tx["Beschreibung"]);
        }
        
        if (!licensePlate) return false;
        
        const key = `${licensePlate}-${timestamp}-${Math.round(amount * 100)}`;
        return !existingKeys.has(key);
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
          const ts = tx["Zeitpunkt"];
          if (ts.includes('+')) {
            timestamp = parsePaymentTimestamp(ts);
          } else {
            timestamp = parseISO(ts);
          }
        } else {
          timestamp = new Date();
        }
        
        let licensePlate = tx["Kennzeichen"];
        if (!licensePlate && tx["Beschreibung"]) {
          licensePlate = extractLicensePlate(tx["Beschreibung"]);
        }
        
        return {
          sessionId,
          licensePlate: licensePlate || "",
          transactionTime: timestamp,
          amount: Math.round(amount * 100),
          description: tx["Beschreibung"] || null,
          rawData: tx,
        };
      }).filter((tx: any) => tx.licensePlate);

      await storage.createTransactions(dbTransactions);

      res.json({ success: true, added: dbTransactions.length });
    } catch (error) {
      console.error("Error uploading transactions:", error);
      res.status(500).json({ error: "Failed to upload transactions" });
    }
  });

  app.post("/api/session/reset", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      await storage.deleteTripsForSession(sessionId);
      await storage.deleteTransactionsForSession(sessionId);
      await storage.updateSessionActivity(sessionId, 1);
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting session:", error);
      res.status(500).json({ error: "Failed to reset session" });
    }
  });

  app.get("/api/admin/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      
      const sessionsWithCounts = await Promise.all(
        sessions.map(async (session) => {
          const trips = await storage.getTripsBySession(session.sessionId);
          const transactions = await storage.getTransactionsBySession(session.sessionId);
          
          return {
            ...session,
            tripCount: trips.length,
            transactionCount: transactions.length,
          };
        })
      );

      res.json(sessionsWithCounts);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/admin/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const trips = await storage.getTripsBySession(sessionId);
      const transactions = await storage.getTransactionsBySession(sessionId);

      const frontendTrips = trips.map(t => ({
        "Kennzeichen": t.licensePlate,
        "Zeitpunkt der Fahrtbestellung": t.orderTime.toISOString(),
        "Fahrtstatus": t.tripStatus,
        "Fahrt-ID": t.tripId || undefined,
        ...t.rawData as any,
      }));

      const frontendTransactions = transactions.map(tx => ({
        "Kennzeichen": tx.licensePlate,
        "Zeitpunkt": tx.transactionTime.toISOString(),
        "Betrag": tx.amount / 100,
        "Beschreibung": tx.description || undefined,
        ...tx.rawData as any,
      }));

      res.json({
        trips: frontendTrips,
        transactions: frontendTransactions,
      });
    } catch (error) {
      console.error("Error fetching session details:", error);
      res.status(500).json({ error: "Failed to fetch session details" });
    }
  });

  app.delete("/api/admin/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      await storage.deleteSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  return httpServer;
}
