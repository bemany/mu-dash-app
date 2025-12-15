import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { parseISO } from "date-fns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Generate or retrieve session ID from cookies
  app.use((req, res, next) => {
    if (!req.session.uberRetterSessionId) {
      req.session.uberRetterSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
  });

  // Get session data (trips, transactions, current step)
  app.get("/api/session", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const session = await storage.getOrCreateSession(sessionId);
      const trips = await storage.getTripsBySession(sessionId);
      const transactions = await storage.getTransactionsBySession(sessionId);

      // Convert DB format back to frontend format
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
        "Betrag": tx.amount / 100, // Convert cents back to euros
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

  // Update current step
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

  // Upload trips
  app.post("/api/trips", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { trips } = req.body;

      if (!Array.isArray(trips)) {
        return res.status(400).json({ error: "Invalid trips data" });
      }

      // Get existing trips to check for duplicates
      const existingTrips = await storage.getTripsBySession(sessionId);
      const existingIds = new Set(
        existingTrips.map(t => 
          t.tripId || `${t.licensePlate}-${t.orderTime.toISOString()}`
        )
      );

      // Filter out duplicates
      const newTrips = trips.filter((trip: any) => {
        const id = trip["Fahrt-ID"] || `${trip["Kennzeichen"]}-${trip["Zeitpunkt der Fahrtbestellung"]}`;
        return !existingIds.has(id);
      });

      // Convert to DB format
      const dbTrips = newTrips.map((trip: any) => ({
        sessionId,
        tripId: trip["Fahrt-ID"] || null,
        licensePlate: trip["Kennzeichen"],
        orderTime: parseISO(trip["Zeitpunkt der Fahrtbestellung"]),
        tripStatus: trip["Fahrtstatus"],
        rawData: trip,
      }));

      await storage.createTrips(dbTrips);
      await storage.updateSessionActivity(sessionId, 2);

      res.json({ success: true, added: newTrips.length });
    } catch (error) {
      console.error("Error uploading trips:", error);
      res.status(500).json({ error: "Failed to upload trips" });
    }
  });

  // Upload transactions
  app.post("/api/transactions", async (req, res) => {
    try {
      const sessionId = req.session.uberRetterSessionId!;
      const { transactions } = req.body;

      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Invalid transactions data" });
      }

      // Get existing transactions to check for duplicates
      const existingTransactions = await storage.getTransactionsBySession(sessionId);
      const existingKeys = new Set(
        existingTransactions.map(tx => 
          `${tx.licensePlate}-${tx.transactionTime.toISOString()}-${tx.amount}`
        )
      );

      // Filter out duplicates
      const newTransactions = transactions.filter((tx: any) => {
        const amount = typeof tx["Betrag"] === 'string' 
          ? parseFloat(tx["Betrag"].replace(',', '.')) 
          : tx["Betrag"];
        const key = `${tx["Kennzeichen"]}-${tx["Zeitpunkt"]}-${Math.round(amount * 100)}`;
        return !existingKeys.has(key);
      });

      // Convert to DB format
      const dbTransactions = newTransactions.map((tx: any) => {
        const amount = typeof tx["Betrag"] === 'string' 
          ? parseFloat(tx["Betrag"].replace(',', '.')) 
          : tx["Betrag"];
        
        return {
          sessionId,
          licensePlate: tx["Kennzeichen"],
          transactionTime: parseISO(tx["Zeitpunkt"]),
          amount: Math.round(amount * 100), // Convert euros to cents
          description: tx["Beschreibung"] || null,
          rawData: tx,
        };
      });

      await storage.createTransactions(dbTransactions);
      await storage.updateSessionActivity(sessionId, 4);

      res.json({ success: true, added: newTransactions.length });
    } catch (error) {
      console.error("Error uploading transactions:", error);
      res.status(500).json({ error: "Failed to upload transactions" });
    }
  });

  // Reset session
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

  // Admin: Get all sessions
  app.get("/api/admin/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      
      // Get trip and transaction counts for each session
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

  // Admin: Get session details
  app.get("/api/admin/sessions/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const trips = await storage.getTripsBySession(sessionId);
      const transactions = await storage.getTransactionsBySession(sessionId);

      // Convert to frontend format
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

  // Admin: Delete session
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
