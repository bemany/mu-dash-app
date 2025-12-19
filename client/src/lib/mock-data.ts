import { UberTrip, UberTransaction } from "./types";
import { subMonths, format, addMonths } from "date-fns";

// Anonymous Demo Data - completely fictional
const DEMO_VEHICLES = [
  { plate: "DEMO-001", counts: [517, 361, 720, 680, 520] },
  { plate: "DEMO-002", counts: [624, 737, 814, 753, 676] },
  { plate: "DEMO-003", counts: [301, 736, 486, 268, 290] },
  { plate: "DEMO-004", counts: [817, 730, 576, 746, 445] },
  { plate: "DEMO-005", counts: [253, 296, 340, 330, 278] },
  { plate: "DEMO-006", counts: [758, 806, 720, 536, 650] }
];

const DEMO_DRIVERS = [
  "Fahrer 1",
  "Fahrer 2", 
  "Fahrer 3",
  "Fahrer 4",
  "Fahrer 5"
];

const START_DATE = new Date(2024, 6, 1);

function createTripsForMonth(plate: string, count: number, monthDate: Date): UberTrip[] {
  const trips: UberTrip[] = [];
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

  for (let i = 0; i < count; i++) {
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
  let allTrips: UberTrip[] = [];
  const monthsToUse = 3;
  const startIndex = DEMO_VEHICLES[0].counts.length - monthsToUse;

  DEMO_VEHICLES.forEach(vehicle => {
    for (let i = startIndex; i < vehicle.counts.length; i++) {
      const monthDate = addMonths(START_DATE, i);
      const originalCount = vehicle.counts[i];
      let sampleCount: number;
      if (originalCount > 700) {
        sampleCount = 720 + Math.floor(Math.random() * 50);
      } else if (originalCount > 250) {
        sampleCount = 260 + Math.floor(Math.random() * 40);
      } else {
        sampleCount = Math.ceil(originalCount / 2);
      }
      allTrips = allTrips.concat(createTripsForMonth(vehicle.plate, sampleCount, monthDate));
    }
  });

  return allTrips;
}

export function generateMockTransactions(): UberTransaction[] {
  const txs: UberTransaction[] = [];
  const monthsToUse = 3;
  const startIndex = DEMO_VEHICLES[0].counts.length - monthsToUse;

  DEMO_VEHICLES.forEach(vehicle => {
    for (let i = startIndex; i < vehicle.counts.length; i++) {
      const count = vehicle.counts[i];
      const monthDate = addMonths(START_DATE, i);
      
      let expectedBonus = 0;
      if (count > 699) expectedBonus = 400;
      else if (count > 249) expectedBonus = 250;

      if (expectedBonus > 0) {
         const roll = Math.random();
         let payAmount = expectedBonus;
         let description = "Werbeprämie " + format(monthDate, "MM/yyyy");

         if (roll < 0.1) {
            continue; 
         }
         else if (roll < 0.2) {
            payAmount = expectedBonus - 50;
            description += " (Teilzahlung)";
         }
         else if (roll < 0.25) {
            payAmount = expectedBonus + 50;
            description += " (Korrektur)";
         }

         txs.push({
           "Kennzeichen": vehicle.plate,
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
    { driverName: "Fahrer 1", revenue: 520000, distance: 125000000, hoursWorked: 72, tripCount: 198, shiftCount: 9 },
    { driverName: "Fahrer 2", revenue: 485000, distance: 118000000, hoursWorked: 68, tripCount: 185, shiftCount: 8 },
    { driverName: "Fahrer 3", revenue: 465000, distance: 112000000, hoursWorked: 65, tripCount: 172, shiftCount: 8 },
    { driverName: "Fahrer 4", revenue: 445000, distance: 108000000, hoursWorked: 62, tripCount: 168, shiftCount: 8 },
    { driverName: "Fahrer 5", revenue: 535000, distance: 117000000, hoursWorked: 53, tripCount: 169, shiftCount: 7 },
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
    { licensePlate: "DEMO-001", revenue: 620000, distance: 145000000, hoursWorked: 85, tripCount: 228 },
    { licensePlate: "DEMO-002", revenue: 585000, distance: 138000000, hoursWorked: 78, tripCount: 215 },
    { licensePlate: "DEMO-003", revenue: 548000, distance: 130000000, hoursWorked: 72, tripCount: 198 },
    { licensePlate: "DEMO-004", revenue: 465000, distance: 110000000, hoursWorked: 62, tripCount: 168 },
    { licensePlate: "DEMO-005", revenue: 232000, distance: 57000000, hoursWorked: 23, tripCount: 83 },
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
    { driverName: "Fahrer 1", licensePlate: "DEMO-001", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T06:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T14:30:00Z", shiftType: "day" as const, revenue: 78000, distance: 18500000, hoursWorked: 8.5, tripCount: 28 },
    { driverName: "Fahrer 2", licensePlate: "DEMO-002", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T07:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T15:00:00Z", shiftType: "day" as const, revenue: 72000, distance: 17200000, hoursWorked: 8, tripCount: 25 },
    { driverName: "Fahrer 3", licensePlate: "DEMO-003", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1), "yyyy-MM-dd") + "T18:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T02:30:00Z", shiftType: "night" as const, revenue: 95000, distance: 22000000, hoursWorked: 8.5, tripCount: 32 },
    { driverName: "Fahrer 4", licensePlate: "DEMO-004", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T06:30:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T14:00:00Z", shiftType: "day" as const, revenue: 68000, distance: 16500000, hoursWorked: 7.5, tripCount: 24 },
    { driverName: "Fahrer 5", licensePlate: "DEMO-005", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2), "yyyy-MM-dd") + "T19:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), "yyyy-MM-dd") + "T03:00:00Z", shiftType: "night" as const, revenue: 88000, distance: 21000000, hoursWorked: 8, tripCount: 30 },
    { driverName: "Fahrer 1", licensePlate: "DEMO-001", shiftStart: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), "yyyy-MM-dd") + "T06:00:00Z", shiftEnd: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3), "yyyy-MM-dd") + "T14:00:00Z", shiftType: "day" as const, revenue: 75000, distance: 18000000, hoursWorked: 8, tripCount: 26 },
  ],
  summary: {
    totalShifts: 42,
    dayShifts: 28,
    nightShifts: 14,
    avgShiftDuration: 8.2,
    avgRevenuePerShift: 58333,
  },
};

export const mockShiftReport = {
  shifts: mockPerformanceShifts.shifts,
  byDriver: [
    { driverName: "Fahrer 1", totalShifts: 8, dayShifts: 6, nightShifts: 2, totalRevenue: 480000, totalDistance: 115000000 },
    { driverName: "Fahrer 2", totalShifts: 7, dayShifts: 5, nightShifts: 2, totalRevenue: 420000, totalDistance: 98000000 },
    { driverName: "Fahrer 3", totalShifts: 6, dayShifts: 2, nightShifts: 4, totalRevenue: 510000, totalDistance: 125000000 },
    { driverName: "Fahrer 4", totalShifts: 5, dayShifts: 4, nightShifts: 1, totalRevenue: 350000, totalDistance: 82000000 },
    { driverName: "Fahrer 5", totalShifts: 4, dayShifts: 1, nightShifts: 3, totalRevenue: 380000, totalDistance: 92000000 },
  ],
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
  { licensePlate: "DEMO-001", month: performanceThisMonth, tripCount: 856, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "DEMO-002", month: performanceThisMonth, tripCount: 742, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "DEMO-003", month: performanceThisMonth, tripCount: 698, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
  { licensePlate: "DEMO-004", month: performanceThisMonth, tripCount: 512, theoreticalBonus: 15000, actualPayment: 0, difference: -15000 },
  { licensePlate: "DEMO-005", month: performanceThisMonth, tripCount: 285, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
  { licensePlate: "DEMO-001", month: performanceLastMonth, tripCount: 912, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "DEMO-002", month: performanceLastMonth, tripCount: 788, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "DEMO-003", month: performanceLastMonth, tripCount: 720, theoreticalBonus: 40000, actualPayment: 40000, difference: 0 },
  { licensePlate: "DEMO-004", month: performanceLastMonth, tripCount: 680, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
  { licensePlate: "DEMO-005", month: performanceLastMonth, tripCount: 320, theoreticalBonus: 15000, actualPayment: 15000, difference: 0 },
];

export const mockBonusSummary = {
  totalTheoretical: mockBonusPayouts.reduce((sum, p) => sum + p.theoreticalBonus, 0),
  totalActual: mockBonusPayouts.reduce((sum, p) => sum + p.actualPayment, 0),
  totalDifference: mockBonusPayouts.reduce((sum, p) => sum + p.difference, 0),
};

export interface DriverReportRow {
  firstName: string;
  lastName: string;
  completedTrips: number;
  cancelledTrips: number;
  totalTrips: number;
  avgFarePerTrip: number;
  avgRevenuePerTrip: number;
  totalRevenue: number;
  distanceInTrip: number;
  pricePerKm: number;
  revenuePerDay: number;
  revenuePerHour: number;
  tripsPerHour: number;
  acceptanceRate: number;
  timeInTrip: number;
  shiftCount: number;
  dayShiftCount: number;
  nightShiftCount: number;
}

export interface DriverReportSummary {
  totalRevenue: number;
  totalDistance: number;
  totalHoursWorked: number;
  totalTrips: number;
  totalShifts: number;
  uniqueDrivers: number;
  avgRevenuePerHour: number;
  avgRevenuePerDay: number;
  avgRevenuePerMonth: number;
  avgRevenuePerKm: number;
  avgRevenuePerTrip: number;
  avgRevenuePerDriver: number;
}

export interface VehicleReportRow {
  licensePlate: string;
  completedTrips: number;
  cancelledTrips: number;
  totalTrips: number;
  avgFarePerTrip: number;
  avgRevenuePerTrip: number;
  distanceInTrip: number;
  pricePerKm: number;
  revenuePerDay: number;
  revenueNightShift: number;
  revenueDayShift: number;
  totalRevenue: number;
  revenuePerHour: number;
  tripsPerHour: number;
  acceptanceRate: number;
  timeInTrip: number;
  shiftCount: number;
  dayShiftCount: number;
  nightShiftCount: number;
  occupancyRate: number;
}

export interface VehicleReportSummary {
  totalRevenue: number;
  totalDistance: number;
  totalHoursWorked: number;
  totalTrips: number;
  totalShifts: number;
  uniqueVehicles: number;
  avgRevenuePerHour: number;
  avgRevenuePerDay: number;
  avgRevenuePerMonth: number;
  avgRevenuePerKm: number;
  avgRevenuePerTrip: number;
  avgRevenuePerVehicle: number;
  avgOccupancyRate: number;
}

export interface PromoReportRow {
  licensePlate: string;
  month: string;
  tripCount: number;
  theoreticalBonus: number;
  actualPaid: number;
  difference: number;
}

export interface PromoReportSummary {
  totalTheoreticalBonus: number;
  totalActualPaid: number;
  totalDifference: number;
  totalTrips: number;
  licensePlateCount: number;
  monthCount: number;
}

export const mockDriverReport: { summary: DriverReportSummary; drivers: DriverReportRow[] } = {
  summary: {
    totalRevenue: 24500,
    totalDistance: 5800,
    totalHoursWorked: 320,
    totalTrips: 892,
    totalShifts: 42,
    uniqueDrivers: 5,
    avgRevenuePerHour: 76.56,
    avgRevenuePerDay: 816.67,
    avgRevenuePerMonth: 24500,
    avgRevenuePerKm: 4.22,
    avgRevenuePerTrip: 27.47,
    avgRevenuePerDriver: 4900,
  },
  drivers: [
    { firstName: "Max", lastName: "Mustermann", completedTrips: 198, cancelledTrips: 12, totalTrips: 210, avgFarePerTrip: 26.26, avgRevenuePerTrip: 17.94, totalRevenue: 3552.12, distanceInTrip: 1250, pricePerKm: 2.84, revenuePerDay: 118.40, revenuePerHour: 49.33, tripsPerHour: 2.75, acceptanceRate: 94.3, timeInTrip: 72, shiftCount: 9, dayShiftCount: 6, nightShiftCount: 3 },
    { firstName: "Anna", lastName: "Schmidt", completedTrips: 185, cancelledTrips: 8, totalTrips: 193, avgFarePerTrip: 26.22, avgRevenuePerTrip: 17.91, totalRevenue: 3313.35, distanceInTrip: 1180, pricePerKm: 2.81, revenuePerDay: 110.45, revenuePerHour: 48.73, tripsPerHour: 2.72, acceptanceRate: 95.9, timeInTrip: 68, shiftCount: 8, dayShiftCount: 2, nightShiftCount: 6 },
    { firstName: "Thomas", lastName: "Weber", completedTrips: 172, cancelledTrips: 15, totalTrips: 187, avgFarePerTrip: 27.03, avgRevenuePerTrip: 18.46, totalRevenue: 3175.12, distanceInTrip: 1120, pricePerKm: 2.83, revenuePerDay: 105.84, revenuePerHour: 48.85, tripsPerHour: 2.65, acceptanceRate: 92.0, timeInTrip: 65, shiftCount: 8, dayShiftCount: 5, nightShiftCount: 3 },
    { firstName: "Lisa", lastName: "Müller", completedTrips: 168, cancelledTrips: 5, totalTrips: 173, avgFarePerTrip: 26.49, avgRevenuePerTrip: 18.09, totalRevenue: 3039.12, distanceInTrip: 1080, pricePerKm: 2.81, revenuePerDay: 101.30, revenuePerHour: 49.02, tripsPerHour: 2.71, acceptanceRate: 97.1, timeInTrip: 62, shiftCount: 8, dayShiftCount: 7, nightShiftCount: 1 },
    { firstName: "Mehmet", lastName: "Yilmaz", completedTrips: 169, cancelledTrips: 10, totalTrips: 179, avgFarePerTrip: 31.66, avgRevenuePerTrip: 21.62, totalRevenue: 3653.78, distanceInTrip: 1170, pricePerKm: 3.12, revenuePerDay: 121.79, revenuePerHour: 68.94, tripsPerHour: 3.19, acceptanceRate: 94.4, timeInTrip: 53, shiftCount: 7, dayShiftCount: 1, nightShiftCount: 6 },
  ],
};

export const mockVehicleReport: { summary: VehicleReportSummary; vehicles: VehicleReportRow[] } = {
  summary: {
    totalRevenue: 24500,
    totalDistance: 5800,
    totalHoursWorked: 320,
    totalTrips: 892,
    totalShifts: 42,
    uniqueVehicles: 5,
    avgRevenuePerHour: 76.56,
    avgRevenuePerDay: 816.67,
    avgRevenuePerMonth: 24500,
    avgRevenuePerKm: 4.22,
    avgRevenuePerTrip: 27.47,
    avgRevenuePerVehicle: 4900,
    avgOccupancyRate: 72.5,
  },
  vehicles: [
    { licensePlate: "DEMO-001", completedTrips: 228, cancelledTrips: 14, totalTrips: 242, avgFarePerTrip: 27.19, avgRevenuePerTrip: 18.57, distanceInTrip: 1450, pricePerKm: 2.92, revenuePerDay: 141.23, revenueNightShift: 1912, revenueDayShift: 2322, totalRevenue: 4234, revenuePerHour: 49.81, tripsPerHour: 2.68, acceptanceRate: 94.2, timeInTrip: 85, shiftCount: 10, dayShiftCount: 6, nightShiftCount: 4, occupancyRate: 85.5 },
    { licensePlate: "DEMO-002", completedTrips: 215, cancelledTrips: 11, totalTrips: 226, avgFarePerTrip: 27.21, avgRevenuePerTrip: 18.59, distanceInTrip: 1380, pricePerKm: 2.90, revenuePerDay: 133.23, revenueNightShift: 1776, revenueDayShift: 2220, totalRevenue: 3996, revenuePerHour: 51.23, tripsPerHour: 2.76, acceptanceRate: 95.1, timeInTrip: 78, shiftCount: 9, dayShiftCount: 5, nightShiftCount: 4, occupancyRate: 78.2 },
    { licensePlate: "DEMO-003", completedTrips: 198, cancelledTrips: 9, totalTrips: 207, avgFarePerTrip: 27.68, avgRevenuePerTrip: 18.90, distanceInTrip: 1300, pricePerKm: 2.88, revenuePerDay: 124.78, revenueNightShift: 1639, revenueDayShift: 2103, totalRevenue: 3742, revenuePerHour: 51.97, tripsPerHour: 2.75, acceptanceRate: 95.7, timeInTrip: 72, shiftCount: 8, dayShiftCount: 5, nightShiftCount: 3, occupancyRate: 72.0 },
    { licensePlate: "DEMO-004", completedTrips: 168, cancelledTrips: 8, totalTrips: 176, avgFarePerTrip: 27.68, avgRevenuePerTrip: 18.90, distanceInTrip: 1100, pricePerKm: 2.89, revenuePerDay: 105.90, revenueNightShift: 1400, revenueDayShift: 1776, totalRevenue: 3176, revenuePerHour: 51.23, tripsPerHour: 2.71, acceptanceRate: 95.5, timeInTrip: 62, shiftCount: 8, dayShiftCount: 4, nightShiftCount: 4, occupancyRate: 65.8 },
    { licensePlate: "DEMO-005", completedTrips: 83, cancelledTrips: 3, totalTrips: 86, avgFarePerTrip: 27.95, avgRevenuePerTrip: 19.09, distanceInTrip: 570, pricePerKm: 2.78, revenuePerDay: 52.82, revenueNightShift: 683, revenueDayShift: 901, totalRevenue: 1584, revenuePerHour: 68.87, tripsPerHour: 3.61, acceptanceRate: 96.5, timeInTrip: 23, shiftCount: 4, dayShiftCount: 3, nightShiftCount: 1, occupancyRate: 61.0 },
  ],
};

export const mockPromoReport: { summary: PromoReportSummary; rows: PromoReportRow[] } = {
  summary: {
    totalTheoreticalBonus: 2200,
    totalActualPaid: 2050,
    totalDifference: -150,
    totalTrips: 4293,
    licensePlateCount: 5,
    monthCount: 2,
  },
  rows: [
    { licensePlate: "DEMO-001", month: performanceThisMonth, tripCount: 856, theoreticalBonus: 400, actualPaid: 400, difference: 0 },
    { licensePlate: "DEMO-002", month: performanceThisMonth, tripCount: 742, theoreticalBonus: 400, actualPaid: 400, difference: 0 },
    { licensePlate: "DEMO-003", month: performanceThisMonth, tripCount: 698, theoreticalBonus: 250, actualPaid: 250, difference: 0 },
    { licensePlate: "DEMO-004", month: performanceThisMonth, tripCount: 512, theoreticalBonus: 250, actualPaid: 100, difference: -150 },
    { licensePlate: "DEMO-005", month: performanceThisMonth, tripCount: 285, theoreticalBonus: 250, actualPaid: 250, difference: 0 },
    { licensePlate: "DEMO-001", month: performanceLastMonth, tripCount: 912, theoreticalBonus: 400, actualPaid: 400, difference: 0 },
    { licensePlate: "DEMO-002", month: performanceLastMonth, tripCount: 788, theoreticalBonus: 400, actualPaid: 400, difference: 0 },
  ],
};
