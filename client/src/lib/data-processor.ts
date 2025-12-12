import { UberTrip, UberTransaction, DriverSummary, MonthlyStats } from "./types";
import { parseISO, format, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";

export function processTripsAndTransactions(trips: UberTrip[], transactions: UberTransaction[] = []): DriverSummary[] {
  const driverMap = new Map<string, DriverSummary>();

  // Helper to get or create driver entry
  const getDriver = (plate: string) => {
    if (!plate) return null;
    const normalizedPlate = plate.trim();
    if (!driverMap.has(normalizedPlate)) {
      driverMap.set(normalizedPlate, {
        licensePlate: normalizedPlate,
        stats: {},
        totalCount: 0,
        totalBonus: 0,
        totalPaid: 0,
        totalDifference: 0
      });
    }
    return driverMap.get(normalizedPlate)!;
  };

  // 1. Process Trips
  trips.forEach(trip => {
    if (trip["Fahrtstatus"] !== "completed") return;

    const date = parseISO(trip["Zeitpunkt der Fahrtbestellung"]);
    const monthKey = format(startOfMonth(date), "yyyy-MM");
    
    const driver = getDriver(trip["Kennzeichen"]);
    if (!driver) return;
    
    if (!driver.stats[monthKey]) {
      driver.stats[monthKey] = { monthKey, count: 0, bonus: 0, paidAmount: 0, difference: 0 };
    }

    driver.stats[monthKey].count++;
  });

  // 2. Process Transactions
  transactions.forEach(tx => {
    const date = parseISO(tx["Zeitpunkt"]);
    // Assuming payments are made in the SAME month or NEXT month? 
    // For simplicity, let's match transaction date month to bonus month for now, 
    // or we might need a "reference month" in the transaction data.
    // Let's assume the transaction date IS the relevant month for now.
    const monthKey = format(startOfMonth(date), "yyyy-MM");
    
    const driver = getDriver(tx["Kennzeichen"]);
    if (!driver) return;

    if (!driver.stats[monthKey]) {
      driver.stats[monthKey] = { monthKey, count: 0, bonus: 0, paidAmount: 0, difference: 0 };
    }

    // Parse amount if string
    const amount = typeof tx["Betrag"] === 'string' 
      ? parseFloat((tx["Betrag"] as string).replace(',', '.')) 
      : (tx["Betrag"] || 0);
      
    driver.stats[monthKey].paidAmount += amount;
  });

  // 3. Calculate Bonuses and Summaries
  const summaries = Array.from(driverMap.values()).map(driver => {
    let totalCount = 0;
    let totalBonus = 0;
    let totalPaid = 0;
    let totalDifference = 0;

    Object.values(driver.stats).forEach(stat => {
      // Bonus Rules
      if (stat.count > 699) {
        stat.bonus = 400;
      } else if (stat.count > 249) {
        stat.bonus = 250;
      } else {
        stat.bonus = 0;
      }
      
      stat.difference = stat.bonus - stat.paidAmount;

      totalCount += stat.count;
      totalBonus += stat.bonus;
      totalPaid += stat.paidAmount;
      totalDifference += stat.difference;
    });

    return { ...driver, totalCount, totalBonus, totalPaid, totalDifference };
  });

  return summaries.sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
}

export function getMonthHeaders(summaries: DriverSummary[]): string[] {
  const months = new Set<string>();
  summaries.forEach(s => Object.keys(s.stats).forEach(m => months.add(m)));
  return Array.from(months).sort();
}

export function formatMonthHeader(monthKey: string): string {
  const date = parseISO(monthKey + "-01");
  return format(date, "MMMM yyyy", { locale: de });
}
