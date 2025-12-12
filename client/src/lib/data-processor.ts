import { UberTrip, DriverSummary, MonthlyStats } from "./types";
import { parseISO, format, startOfMonth } from "date-fns";
import { de } from "date-fns/locale";

export function processTrips(trips: UberTrip[]): DriverSummary[] {
  const driverMap = new Map<string, DriverSummary>();

  // Helper to get or create driver entry
  const getDriver = (plate: string) => {
    if (!driverMap.has(plate)) {
      driverMap.set(plate, {
        licensePlate: plate,
        stats: {},
        totalCount: 0,
        totalBonus: 0
      });
    }
    return driverMap.get(plate)!;
  };

  trips.forEach(trip => {
    // Filter only completed trips as per SQL query
    if (trip["Fahrtstatus"] !== "completed") return;

    const date = parseISO(trip["Zeitpunkt der Fahrtbestellung"]);
    const monthKey = format(startOfMonth(date), "yyyy-MM"); // e.g., "2024-09"
    
    const driver = getDriver(trip["Kennzeichen"]);
    
    if (!driver.stats[monthKey]) {
      driver.stats[monthKey] = { monthKey, count: 0, bonus: 0 };
    }

    driver.stats[monthKey].count++;
  });

  // Calculate bonuses after counting all trips
  // Logic: > 699 -> 400, > 249 -> 250, else 0
  const summaries = Array.from(driverMap.values()).map(driver => {
    let totalCount = 0;
    let totalBonus = 0;

    Object.values(driver.stats).forEach(stat => {
      if (stat.count > 699) {
        stat.bonus = 400;
      } else if (stat.count > 249) {
        stat.bonus = 250;
      } else {
        stat.bonus = 0;
      }
      totalCount += stat.count;
      totalBonus += stat.bonus;
    });

    return { ...driver, totalCount, totalBonus };
  });

  // Sort by License Plate ASC
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
