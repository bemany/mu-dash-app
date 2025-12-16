import { UberTrip, UberTransaction, DriverSummary, MonthlyStats } from "./types";
import { parseISO, format, startOfMonth, parse } from "date-fns";
import { de } from "date-fns/locale";

const LICENSE_PLATE_REGEX = /[A-Z]{1,3}-[A-Z]{1,3}\s?\d{1,4}[A-Z]?/i;

export function extractLicensePlate(description: string): string | null {
  const match = description.match(LICENSE_PLATE_REGEX);
  return match ? match[0].toUpperCase().replace(/\s/g, '') : null;
}

export function parsePaymentTimestamp(timestamp: string): Date {
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

export function processPaymentCSV(rawData: any[]): UberTransaction[] {
  return rawData
    .filter(row => {
      const description = row["Beschreibung"] || "";
      return description.startsWith("Fahrzeugbasierte Aktion für");
    })
    .map(row => {
      const description = row["Beschreibung"] || "";
      const licensePlate = extractLicensePlate(description);
      const amountStr = row["An dein Unternehmen gezahlt"] || "0";
      const amount = typeof amountStr === 'string' 
        ? parseFloat(amountStr.replace(',', '.')) 
        : amountStr;
      const timestamp = row["vs-Berichterstattung"] || "";
      
      return {
        "Kennzeichen": licensePlate || "",
        "Zeitpunkt": timestamp,
        "Betrag": amount,
        "Beschreibung": description,
        "Firmenname": row["Name des Unternehmens"] || ""
      };
    })
    .filter(tx => tx["Kennzeichen"]);
}

export function processTripsAndTransactions(trips: UberTrip[], transactions: UberTransaction[] = []): DriverSummary[] {
  const driverMap = new Map<string, DriverSummary>();

  const getDriver = (plate: string) => {
    if (!plate) return null;
    const normalizedPlate = plate.trim().toUpperCase().replace(/\s/g, '');
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

  trips.forEach(trip => {
    // Nur completed Fahrten zählen
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

  transactions.forEach(tx => {
    const timestamp = tx["Zeitpunkt"];
    let date: Date;
    
    if (timestamp.includes('+')) {
      date = parsePaymentTimestamp(timestamp);
    } else {
      date = parseISO(timestamp);
    }
    
    const monthKey = format(startOfMonth(date), "yyyy-MM");
    
    const driver = getDriver(tx["Kennzeichen"]);
    if (!driver) return;

    if (!driver.stats[monthKey]) {
      driver.stats[monthKey] = { monthKey, count: 0, bonus: 0, paidAmount: 0, difference: 0 };
    }

    const amount = typeof tx["Betrag"] === 'string' 
      ? parseFloat((tx["Betrag"] as string).replace(',', '.')) 
      : (tx["Betrag"] || 0);
      
    driver.stats[monthKey].paidAmount += amount;
  });

  const summaries = Array.from(driverMap.values()).map(driver => {
    let totalCount = 0;
    let totalBonus = 0;
    let totalPaid = 0;
    let totalDifference = 0;

    Object.values(driver.stats).forEach(stat => {
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
  return format(date, "MM.yy", { locale: de });
}

export interface TransactionMatch {
  transaction: UberTransaction;
  matched: boolean;
  licensePlate: string | null;
}

export function analyzeTransactions(transactions: UberTransaction[], knownPlates: Set<string>): {
  matched: TransactionMatch[];
  unmatched: TransactionMatch[];
} {
  const matched: TransactionMatch[] = [];
  const unmatched: TransactionMatch[] = [];

  transactions.forEach(tx => {
    const plate = tx["Kennzeichen"];
    const normalizedPlate = plate ? plate.trim().toUpperCase().replace(/\s/g, '') : null;
    
    if (normalizedPlate && knownPlates.has(normalizedPlate)) {
      matched.push({ transaction: tx, matched: true, licensePlate: normalizedPlate });
    } else {
      unmatched.push({ transaction: tx, matched: false, licensePlate: normalizedPlate });
    }
  });

  return { matched, unmatched };
}
