import { UberTrip, UberTransaction } from "./types";
import { subMonths, format, startOfMonth, addMonths, parse } from "date-fns";

// Specific Real Data from User
const REAL_DATA = [
  {
    plate: "B-CB8082",
    counts: [517, 361, 2290, 1039, 994, 1169, 693, 615, 604, 683, 753, 660, 945, 633, 106, 875]
  },
  {
    plate: "B-ER3140",
    counts: [624, 737, 1814, 753, 676, 526, 523, 557, 763, 888, 871, 816, 681, 755, 520, 467]
  },
  {
    plate: "B-ER3150",
    counts: [1301, 736, 1186, 1168, 1090, 978, 690, 845, 634, 826, 1090, 940, 329, 103, 0, 0] // Zeros padding for missing months if any
  },
  {
    plate: "B-ER3159",
    counts: [817, 730, 1576, 1246, 445, 710, 748, 908, 482, 537, 886, 1026, 831, 802, 401, 213]
  },
  {
    plate: "B-ER3160",
    counts: [953, 996, 1940, 930, 878, 834, 813, 632, 1001, 828, 820, 691, 708, 633, 965, 800]
  },
  {
    plate: "B-ER3162",
    counts: [758, 1006, 2120, 936, 1050, 1041, 372, 437, 135, 312, 515, 649, 154, 635, 126, 350]
  }
];

const START_DATE = new Date(2024, 6, 1); // July 2024 (Month is 0-indexed: 6 = July)

function createTripsForMonth(plate: string, count: number, monthDate: Date): UberTrip[] {
  const trips: UberTrip[] = [];
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  for (let i = 0; i < count; i++) {
    // Distribute trips randomly across the month
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    const hour = Math.floor(Math.random() * 24);
    const minute = Math.floor(Math.random() * 60);
    
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day, hour, minute);
    
    trips.push({
      "Kennzeichen": plate,
      "Zeitpunkt der Fahrtbestellung": date.toISOString(),
      "Fahrtstatus": "completed",
      "Fahrt-ID": Math.random().toString(36).substring(7),
    });
  }
  return trips;
}

export function generateMockTrips(count: number = 5000): UberTrip[] {
  // Generate based on REAL_DATA but sample down counts to avoid huge payloads
  let allTrips: UberTrip[] = [];

  // Use only last 3 months for demo to keep data size reasonable
  const monthsToUse = 3;
  const startIndex = REAL_DATA[0].counts.length - monthsToUse;

  REAL_DATA.forEach(driver => {
    for (let i = startIndex; i < driver.counts.length; i++) {
      const monthDate = addMonths(START_DATE, i);
      // Scale down but keep trips proportional to bonus thresholds
      // Ensure some months qualify for bonuses (250+ for €250, 700+ for €400)
      const originalCount = driver.counts[i];
      let sampleCount: number;
      if (originalCount > 700) {
        sampleCount = 720 + Math.floor(Math.random() * 50); // Will qualify for €400 bonus (needs >699)
      } else if (originalCount > 250) {
        sampleCount = 260 + Math.floor(Math.random() * 40); // Will qualify for €250 bonus (needs >249)
      } else {
        sampleCount = Math.ceil(originalCount / 2); // Keep below threshold
      }
      allTrips = allTrips.concat(createTripsForMonth(driver.plate, sampleCount, monthDate));
    }
  });

  return allTrips;
}

export function generateMockTransactions(): UberTransaction[] {
  const txs: UberTransaction[] = [];
  
  // Use only last 3 months to match trips
  const monthsToUse = 3;
  const startIndex = REAL_DATA[0].counts.length - monthsToUse;

  REAL_DATA.forEach(driver => {
    for (let i = startIndex; i < driver.counts.length; i++) {
      const count = driver.counts[i];
      const monthDate = addMonths(START_DATE, i);
      
      // Calculate Expected Bonus
      let expectedBonus = 0;
      if (count > 699) expectedBonus = 400;
      else if (count > 249) expectedBonus = 250;

      if (expectedBonus > 0) {
         // Create a Payment Transaction
         // Introduce some "Real World" messiness
         
         const roll = Math.random();
         let payAmount = expectedBonus;
         let description = "Werbeprämie " + format(monthDate, "MM/yyyy");

         // 10% chance of missed payment
         if (roll < 0.1) {
            continue; 
         }
         // 10% chance of partial payment
         else if (roll < 0.2) {
            payAmount = expectedBonus - 50;
            description += " (Teilzahlung)";
         }
         // 5% chance of overpayment (correction)
         else if (roll < 0.25) {
            payAmount = expectedBonus + 50;
            description += " (Korrektur)";
         }

         txs.push({
           "Kennzeichen": driver.plate,
           "Zeitpunkt": monthDate.toISOString(),
           "Betrag": payAmount,
           "Beschreibung": description
         });
      }
    }
  });
  
  return txs;
}

// Performance Dashboard Mock Data
const today = new Date();
const performanceThisMonth = format(today, "yyyy-MM");
const performanceLastMonth = format(subMonths(today, 1), "yyyy-MM");

function generatePerformanceDayData(daysBack: number) {
  const days = [];
  const now = new Date();
  for (let i = daysBack; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseRevenue = isWeekend ? 85000 : 65000;
    const variance = Math.floor(Math.random() * 20000) - 10000;
    days.push({
      day: format(date, "yyyy-MM-dd"),
      revenue: baseRevenue + variance,
      distance: (120 + Math.floor(Math.random() * 80)) * 100000,
      hoursWorked: 8 + Math.random() * 4,
      tripCount: 18 + Math.floor(Math.random() * 12),
    });
  }
  return days;
}

export const mockPerformanceKpis = {
  totals: {
    totalRevenue: 2450000,
    totalDistance: 580000000,
    totalHoursWorked: 320,
    tripCount: 892,
  },
  byDay: generatePerformanceDayData(30),
  byMonth: [
    { month: performanceLastMonth, revenue: 2180000, distance: 520000000, hoursWorked: 295, tripCount: 812 },
    { month: performanceThisMonth, revenue: 2450000, distance: 580000000, hoursWorked: 320, tripCount: 892 },
  ],
};

export const mockPerformanceDrivers = {
  drivers: [
    { driverName: "Mehmet Yilmaz", revenue: 520000, distance: 125000000, hoursWorked: 72, tripCount: 198 },
    { driverName: "Ahmed Hassan", revenue: 485000, distance: 118000000, hoursWorked: 68, tripCount: 185 },
    { driverName: "Sergej Petrov", revenue: 465000, distance: 112000000, hoursWorked: 65, tripCount: 172 },
    { driverName: "Ali Özdemir", revenue: 445000, distance: 108000000, hoursWorked: 62, tripCount: 168 },
    { driverName: "Karim Benzema", revenue: 535000, distance: 117000000, hoursWorked: 53, tripCount: 169 },
  ],
  totals: {
    revenue: 2450000,
    distance: 580000000,
    hoursWorked: 320,
    tripCount: 892,
  },
};

export const mockPerformanceVehicles = {
  vehicles: [
    { licensePlate: "B-ER3602", revenue: 620000, distance: 145000000, hoursWorked: 85, tripCount: 228 },
    { licensePlate: "B-ER4502", revenue: 585000, distance: 138000000, hoursWorked: 78, tripCount: 215 },
    { licensePlate: "B-VZ5000", revenue: 548000, distance: 130000000, hoursWorked: 72, tripCount: 198 },
    { licensePlate: "B-ER8002", revenue: 465000, distance: 110000000, hoursWorked: 62, tripCount: 168 },
    { licensePlate: "B-SF1095", revenue: 232000, distance: 57000000, hoursWorked: 23, tripCount: 83 },
  ],
  totals: {
    revenue: 2450000,
    distance: 580000000,
    hoursWorked: 320,
    tripCount: 892,
  },
};

export const mockPerformanceShifts = {
  shifts: [
    { driverName: "Mehmet Yilmaz", licensePlate: "B-ER3602", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T06:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T14:30:00Z", shiftType: "day" as const, revenue: 78000, distance: 18500000, hoursWorked: 8.5, tripCount: 28 },
    { driverName: "Ahmed Hassan", licensePlate: "B-ER4502", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T07:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T15:00:00Z", shiftType: "day" as const, revenue: 72000, distance: 17200000, hoursWorked: 8, tripCount: 25 },
    { driverName: "Sergej Petrov", licensePlate: "B-VZ5000", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T18:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T02:30:00Z", shiftType: "night" as const, revenue: 95000, distance: 22000000, hoursWorked: 8.5, tripCount: 32 },
    { driverName: "Ali Özdemir", licensePlate: "B-ER8002", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T06:30:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T14:00:00Z", shiftType: "day" as const, revenue: 68000, distance: 16500000, hoursWorked: 7.5, tripCount: 24 },
    { driverName: "Karim Benzema", licensePlate: "B-SF1095", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T19:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), "yyyy-MM-dd") + "T03:00:00Z", shiftType: "night" as const, revenue: 88000, distance: 21000000, hoursWorked: 8, tripCount: 30 },
    { driverName: "Mehmet Yilmaz", licensePlate: "B-ER3602", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), "yyyy-MM-dd") + "T06:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), "yyyy-MM-dd") + "T14:00:00Z", shiftType: "day" as const, revenue: 75000, distance: 18000000, hoursWorked: 8, tripCount: 26 },
  ],
  summary: {
    totalShifts: 42,
    dayShifts: 28,
    nightShifts: 14,
    avgShiftDuration: 8.2,
    avgRevenuePerShift: 58333,
  },
};

export interface BonusPayout {
  licensePlate: string;
  month: string;
  tripCount: number;
  theoreticalBonus: number;
  actualPayment: number;
  difference: number;
}

export const mockBonusPayouts: BonusPayout[] = [
  { licensePlate: "B-ER3602", month: performanceThisMonth, tripCount: 856, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "B-ER4502", month: performanceThisMonth, tripCount: 742, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "B-VZ5000", month: performanceThisMonth, tripCount: 698, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
  { licensePlate: "B-ER8002", month: performanceThisMonth, tripCount: 512, theoreticalBonus: 15000, actualPayment: 0, difference: -15000 },
  { licensePlate: "B-SF1095", month: performanceThisMonth, tripCount: 285, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
  { licensePlate: "B-ER3602", month: performanceLastMonth, tripCount: 912, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "B-ER4502", month: performanceLastMonth, tripCount: 788, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "B-VZ5000", month: performanceLastMonth, tripCount: 720, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "B-ER8002", month: performanceLastMonth, tripCount: 680, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
  { licensePlate: "B-SF1095", month: performanceLastMonth, tripCount: 320, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
];

export const mockBonusSummary = {
  totalTheoretical: mockBonusPayouts.reduce((sum, p) => sum + p.theoreticalBonus, 0),
  totalActual: mockBonusPayouts.reduce((sum, p) => sum + p.actualPayment, 0),
  totalDifference: mockBonusPayouts.reduce((sum, p) => sum + p.difference, 0),
};
