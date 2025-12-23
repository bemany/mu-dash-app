import { subMonths, format, addMonths } from "date-fns";

const today = new Date();
const performanceThisMonth = format(today, "yyyy-MM");
const performanceLastMonth = format(subMonths(today, 1), "yyyy-MM");

const DEMO_VEHICLES = [
  { plate: "B-MU 1001", trips: 19892, fare: 381675 },
  { plate: "B-MU 1002", trips: 18045, fare: 325443 },
  { plate: "B-MU 1003", trips: 16118, fare: 304697 },
  { plate: "B-MU 1004", trips: 16060, fare: 288060 },
  { plate: "B-MU 1005", trips: 15775, fare: 318980 },
  { plate: "B-MU 1006", trips: 15767, fare: 276062 },
  { plate: "B-MU 1007", trips: 15443, fare: 331249 },
  { plate: "B-MU 1008", trips: 14770, fare: 306652 },
  { plate: "B-MU 1009", trips: 14658, fare: 271035 },
  { plate: "B-MU 1010", trips: 14495, fare: 269558 },
  { plate: "B-MU 1011", trips: 14485, fare: 288477 },
  { plate: "B-MU 1012", trips: 14236, fare: 273831 },
  { plate: "B-MU 1013", trips: 13940, fare: 272627 },
  { plate: "B-MU 1014", trips: 13401, fare: 247761 },
  { plate: "B-MU 1015", trips: 12455, fare: 247400 },
  { plate: "B-MU 1016", trips: 11438, fare: 241081 },
  { plate: "B-MU 1017", trips: 11233, fare: 215041 },
  { plate: "B-MU 1018", trips: 9871, fare: 198840 },
  { plate: "B-MU 1019", trips: 8162, fare: 159737 },
  { plate: "B-MU 1020", trips: 6982, fare: 125676 },
  { plate: "B-MU 1021", trips: 6244, fare: 112392 },
  { plate: "B-MU 1022", trips: 5431, fare: 97758 },
  { plate: "B-MU 1023", trips: 4765, fare: 85770 },
  { plate: "B-MU 1024", trips: 3184, fare: 57312 },
  { plate: "B-MU 1025", trips: 1177, fare: 21186 },
];

const DEMO_DRIVERS = [
  { name: "Max Müller", trips: 12238, fare: 195280, cancelled: 1052 },
  { name: "Thomas Schmidt", trips: 10570, fare: 185551, cancelled: 908 },
  { name: "Stefan Weber", trips: 10115, fare: 189620, cancelled: 869 },
  { name: "Michael Fischer", trips: 9610, fare: 199878, cancelled: 826 },
  { name: "Andreas Wagner", trips: 9427, fare: 152277, cancelled: 810 },
  { name: "Peter Becker", trips: 9116, fare: 192319, cancelled: 783 },
  { name: "Klaus Hoffmann", trips: 7496, fare: 134840, cancelled: 644 },
  { name: "Jürgen Schäfer", trips: 7315, fare: 137544, cancelled: 629 },
  { name: "Markus Koch", trips: 6880, fare: 130873, cancelled: 591 },
  { name: "Rainer Bauer", trips: 6251, fare: 115312, cancelled: 537 },
  { name: "Frank Richter", trips: 6154, fare: 119527, cancelled: 529 },
  { name: "Uwe Klein", trips: 5829, fare: 107509, cancelled: 501 },
  { name: "Bernd Wolf", trips: 5793, fare: 120108, cancelled: 498 },
  { name: "Wolfgang Schröder", trips: 5762, fare: 153925, cancelled: 495 },
  { name: "Dieter Neumann", trips: 5749, fare: 108809, cancelled: 494 },
  { name: "Horst Schwarz", trips: 5382, fare: 97550, cancelled: 462 },
  { name: "Werner Zimmermann", trips: 4982, fare: 87167, cancelled: 428 },
  { name: "Günter Braun", trips: 4630, fare: 88400, cancelled: 398 },
  { name: "Helmut Krüger", trips: 4571, fare: 80663, cancelled: 393 },
  { name: "Manfred Hartmann", trips: 4429, fare: 106085, cancelled: 381 },
  { name: "Hans Lange", trips: 4372, fare: 77378, cancelled: 376 },
  { name: "Karl Werner", trips: 4345, fare: 64913, cancelled: 373 },
  { name: "Gerhard Schmitt", trips: 4286, fare: 77283, cancelled: 368 },
  { name: "Walter Meier", trips: 4049, fare: 89989, cancelled: 348 },
  { name: "Herbert Schulz", trips: 3955, fare: 72067, cancelled: 340 },
  { name: "Ernst Maier", trips: 3882, fare: 71671, cancelled: 334 },
  { name: "Otto König", trips: 3861, fare: 56360, cancelled: 332 },
  { name: "Friedrich Mayer", trips: 3785, fare: 109395, cancelled: 325 },
  { name: "Wilhelm Huber", trips: 3637, fare: 103213, cancelled: 313 },
  { name: "Heinrich Kaiser", trips: 3635, fare: 62165, cancelled: 312 },
  { name: "Rudolf Peters", trips: 3564, fare: 69630, cancelled: 306 },
  { name: "Josef Lang", trips: 3548, fare: 69820, cancelled: 305 },
  { name: "Ludwig Jung", trips: 3393, fare: 57668, cancelled: 292 },
  { name: "Albert Fuchs", trips: 3298, fare: 64353, cancelled: 283 },
];

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
  activeDays: number;
}

export interface DriverReportSummary {
  totalRevenue: number;
  totalDistance: number;
  totalHoursWorked: number;
  totalTrips: number;
  totalShifts: number;
  uniqueDrivers: number;
  totalActiveDays: number;
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

const totalTrips = 213218;
const totalFare = 3268487;
const totalRevenue = 2182887;
const totalDistance = 1809498;
const totalShifts = 5706;
const totalHoursWorked = 42991;

export const mockDriverReport: { summary: DriverReportSummary; drivers: DriverReportRow[] } = {
  summary: {
    totalRevenue: totalRevenue,
    totalDistance: totalDistance,
    totalHoursWorked: totalHoursWorked,
    totalTrips: totalTrips,
    totalShifts: totalShifts,
    uniqueDrivers: 34,
    totalActiveDays: 34 * 22,
    avgRevenuePerHour: 39.99,
    avgRevenuePerDay: 301.32,
    avgRevenuePerMonth: totalRevenue,
    avgRevenuePerKm: 1.24,
    avgRevenuePerTrip: 11.13,
    avgRevenuePerDriver: 50568.56,
  },
  drivers: DEMO_DRIVERS.map(d => ({
    firstName: d.name.split(' ')[0],
    lastName: d.name.split(' ')[1] || '',
    completedTrips: d.trips,
    cancelledTrips: d.cancelled,
    totalTrips: d.trips + d.cancelled,
    avgFarePerTrip: d.fare / d.trips,
    avgRevenuePerTrip: (d.fare * 0.667) / d.trips,
    totalRevenue: d.fare * 0.667,
    distanceInTrip: Math.round(d.trips * 8.5),
    pricePerKm: 1.24,
    revenuePerDay: (d.fare * 0.667) / 365,
    revenuePerHour: 39.99,
    tripsPerHour: 3.59,
    acceptanceRate: 92 + Math.random() * 5,
    timeInTrip: Math.round(d.trips * 0.35),
    shiftCount: Math.round(d.trips / 25),
    dayShiftCount: Math.round(d.trips / 25 * 0.6),
    nightShiftCount: Math.round(d.trips / 25 * 0.4),
    activeDays: 15 + Math.round(Math.random() * 10),
  })),
};

export const mockVehicleReport: { summary: VehicleReportSummary; vehicles: VehicleReportRow[] } = {
  summary: {
    totalRevenue: totalRevenue,
    totalDistance: totalDistance,
    totalHoursWorked: totalHoursWorked,
    totalTrips: totalTrips,
    totalShifts: totalShifts,
    uniqueVehicles: 19,
    avgRevenuePerHour: 40.11,
    avgRevenuePerDay: 301.32,
    avgRevenuePerMonth: totalRevenue,
    avgRevenuePerKm: 1.24,
    avgRevenuePerTrip: 11.46,
    avgRevenuePerVehicle: 117918.32,
    avgOccupancyRate: 79.3,
  },
  vehicles: DEMO_VEHICLES.map(v => ({
    licensePlate: v.plate,
    completedTrips: v.trips,
    cancelledTrips: Math.round(v.trips * 0.086),
    totalTrips: v.trips + Math.round(v.trips * 0.086),
    avgFarePerTrip: v.fare / v.trips,
    avgRevenuePerTrip: (v.fare * 0.667) / v.trips,
    distanceInTrip: Math.round(v.trips * 8.5),
    pricePerKm: 1.24,
    revenuePerDay: (v.fare * 0.667) / 365,
    revenueNightShift: v.fare * 0.667 * 0.4,
    revenueDayShift: v.fare * 0.667 * 0.6,
    totalRevenue: v.fare * 0.667,
    revenuePerHour: 40.11,
    tripsPerHour: 3.50,
    acceptanceRate: 91 + Math.random() * 6,
    timeInTrip: Math.round(v.trips * 0.35),
    shiftCount: Math.round(v.trips / 40),
    dayShiftCount: Math.round(v.trips / 40 * 0.6),
    nightShiftCount: Math.round(v.trips / 40 * 0.4),
    occupancyRate: 75 + Math.random() * 10,
  })),
};

const promoMonths = [
  "01/2025", "02/2025", "03/2025", "04/2025", "05/2025", "06/2025",
  "07/2025", "08/2025", "09/2025", "10/2025", "11/2025", "12/2025"
];

const promoRows: PromoReportRow[] = [];
DEMO_VEHICLES.forEach(v => {
  promoMonths.forEach((month, idx) => {
    const baseTrips = Math.round(v.trips / 12);
    const variance = Math.floor(Math.random() * 200) - 100;
    const tripCount = Math.max(0, baseTrips + variance);
    let theo = 0;
    if (tripCount >= 700) theo = 400;
    else if (tripCount >= 250) theo = 250;
    const paid = Math.random() > 0.15 ? theo : (Math.random() > 0.5 ? theo - 150 : 0);
    if (theo > 0) {
      promoRows.push({
        licensePlate: v.plate,
        month: month,
        tripCount: tripCount,
        theoreticalBonus: theo,
        actualPaid: paid,
        difference: paid - theo,
      });
    }
  });
});

export const mockPromoReport: { summary: PromoReportSummary; rows: PromoReportRow[] } = {
  summary: {
    totalTheoreticalBonus: promoRows.reduce((s, r) => s + r.theoreticalBonus, 0),
    totalActualPaid: promoRows.reduce((s, r) => s + r.actualPaid, 0),
    totalDifference: promoRows.reduce((s, r) => s + r.difference, 0),
    totalTrips: promoRows.reduce((s, r) => s + r.tripCount, 0),
    licensePlateCount: 19,
    monthCount: 12,
  },
  rows: promoRows,
};

export const mockPerformanceKpis = {
  totals: {
    totalRevenue: totalRevenue,
    totalDistance: totalDistance,
    totalHoursWorked: totalHoursWorked,
    tripCount: totalTrips,
  },
  byDay: Array.from({ length: 30 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (29 - i));
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    return {
      day: format(date, "yyyy-MM-dd"),
      revenue: (isWeekend ? 7500 : 6000) + Math.floor(Math.random() * 1000),
      distance: 50000 + Math.floor(Math.random() * 10000),
      hoursWorked: 110 + Math.floor(Math.random() * 30),
      tripCount: 550 + Math.floor(Math.random() * 150),
    };
  }),
  byMonth: [
    { month: "2025-01", revenue: 198762, distance: 280277, hoursWorked: 3576, tripCount: 15003 },
    { month: "2025-02", revenue: 200568, distance: 295411, hoursWorked: 3689, tripCount: 15112 },
    { month: "2025-03", revenue: 218830, distance: 321400, hoursWorked: 3987, tripCount: 16472 },
    { month: "2025-04", revenue: 211804, distance: 310266, hoursWorked: 3890, tripCount: 16720 },
    { month: "2025-05", revenue: 228690, distance: 356182, hoursWorked: 4215, tripCount: 18509 },
    { month: "2025-06", revenue: 171336, distance: 276774, hoursWorked: 3423, tripCount: 13358 },
    { month: "2025-07", revenue: 188103, distance: 285184, hoursWorked: 3598, tripCount: 14774 },
    { month: "2025-08", revenue: 215271, distance: 317884, hoursWorked: 3945, tripCount: 16233 },
    { month: "2025-09", revenue: 196507, distance: 299278, hoursWorked: 3689, tripCount: 13790 },
    { month: "2025-10", revenue: 183368, distance: 269515, hoursWorked: 3534, tripCount: 14645 },
    { month: "2025-11", revenue: 169647, distance: 256317, hoursWorked: 3312, tripCount: 14137 },
  ],
};

export const mockPerformanceDrivers = {
  drivers: DEMO_DRIVERS.slice(0, 10).map(d => ({
    driverName: d.name,
    revenue: d.fare * 0.667,
    distance: d.trips * 85,
    hoursWorked: Math.round(d.trips / 3.5),
    tripCount: d.trips,
    shiftCount: Math.round(d.trips / 25),
  })),
  totals: {
    revenue: totalRevenue,
    distance: totalDistance,
    hoursWorked: totalHoursWorked,
    tripCount: totalTrips,
  },
};

export const mockPerformanceVehicles = {
  vehicles: DEMO_VEHICLES.map(v => ({
    licensePlate: v.plate,
    revenue: v.fare * 0.667,
    distance: v.trips * 85,
    hoursWorked: Math.round(v.trips / 3.5),
    tripCount: v.trips,
  })),
  totals: {
    revenue: totalRevenue,
    distance: totalDistance,
    hoursWorked: totalHoursWorked,
    tripCount: totalTrips,
  },
};

export const mockPerformanceShifts = {
  shifts: DEMO_DRIVERS.slice(0, 6).flatMap((d, di) => 
    Array.from({ length: 3 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i - 1);
      const isNight = Math.random() > 0.6;
      return {
        driverName: d.name,
        licensePlate: DEMO_VEHICLES[di % DEMO_VEHICLES.length].plate,
        shiftStart: format(date, "yyyy-MM-dd") + (isNight ? "T18:00:00Z" : "T06:00:00Z"),
        shiftEnd: format(date, "yyyy-MM-dd") + (isNight ? "T02:30:00Z" : "T14:30:00Z"),
        shiftType: isNight ? "night" as const : "day" as const,
        revenue: 600 + Math.floor(Math.random() * 300),
        distance: 150 + Math.floor(Math.random() * 80),
        hoursWorked: 7.5 + Math.random() * 2,
        tripCount: 22 + Math.floor(Math.random() * 12),
      };
    })
  ),
  summary: {
    totalShifts: totalShifts,
    dayShifts: Math.round(totalShifts * 0.6),
    nightShifts: Math.round(totalShifts * 0.4),
    avgShiftDuration: 8.2,
    avgRevenuePerShift: Math.round(totalRevenue / totalShifts),
  },
};

export const mockShiftReport = {
  shifts: mockPerformanceShifts.shifts,
  byDriver: DEMO_DRIVERS.slice(0, 10).map(d => ({
    driverName: d.name,
    totalShifts: Math.round(d.trips / 25),
    dayShifts: Math.round(d.trips / 25 * 0.6),
    nightShifts: Math.round(d.trips / 25 * 0.4),
    totalRevenue: d.fare * 0.667,
    totalDistance: d.trips * 85,
  })),
};

export interface BonusPayout {
  licensePlate: string;
  month: string;
  tripCount: number;
  theoreticalBonus: number;
  actualPayment: number;
  difference: number;
}

export const mockBonusPayouts: BonusPayout[] = promoRows.slice(0, 20).map(r => ({
  licensePlate: r.licensePlate,
  month: r.month,
  tripCount: r.tripCount,
  theoreticalBonus: r.theoreticalBonus,
  actualPayment: r.actualPaid,
  difference: r.difference,
}));

export const mockBonusSummary = {
  totalTheoretical: mockBonusPayouts.reduce((sum, p) => sum + p.theoreticalBonus, 0),
  totalActual: mockBonusPayouts.reduce((sum, p) => sum + p.actualPayment, 0),
  totalDifference: mockBonusPayouts.reduce((sum, p) => sum + p.difference, 0),
};

export interface UberTrip {
  "Kennzeichen": string;
  "Zeitpunkt der Fahrtbestellung": string;
  "Fahrtstatus": string;
  "Fahrt-ID": string;
}

export interface UberTransaction {
  "Kennzeichen": string;
  "Zeitpunkt": string;
  "Betrag": number;
  "Beschreibung": string;
}

export function generateMockTrips(count: number = 5000): UberTrip[] {
  return [];
}

export function generateMockTransactions(): UberTransaction[] {
  return [];
}

export interface CommissionAnalysis {
  summary: {
    totalFarePrice: number;
    totalRevenue: number;
    totalCommission: number;
    commissionPercent: number;
    tripCount: number;
  };
  byDriver: Array<{
    driverName: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
  byVehicle: Array<{
    licensePlate: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
  byMonth: Array<{
    month: string;
    farePrice: number;
    revenue: number;
    commission: number;
    commissionPercent: number;
    tripCount: number;
  }>;
}

export const mockCommissionData: CommissionAnalysis = {
  summary: {
    totalFarePrice: totalFare,
    totalRevenue: totalRevenue,
    totalCommission: totalFare - totalRevenue,
    commissionPercent: ((totalFare - totalRevenue) / totalFare) * 100,
    tripCount: totalTrips,
  },
  byDriver: DEMO_DRIVERS.map(d => {
    const revenue = d.fare * 0.667;
    const commission = d.fare - revenue;
    return {
      driverName: d.name,
      farePrice: d.fare,
      revenue: revenue,
      commission: commission,
      commissionPercent: (commission / d.fare) * 100,
      tripCount: d.trips,
    };
  }),
  byVehicle: DEMO_VEHICLES.map(v => {
    const revenue = v.fare * 0.667;
    const commission = v.fare - revenue;
    return {
      licensePlate: v.plate,
      farePrice: v.fare,
      revenue: revenue,
      commission: commission,
      commissionPercent: (commission / v.fare) * 100,
      tripCount: v.trips,
    };
  }),
  byMonth: [
    { month: "2025-01", farePrice: 298200, revenue: 198800, commission: 99400, commissionPercent: 33.3, tripCount: 15003 },
    { month: "2025-02", farePrice: 301000, revenue: 200700, commission: 100300, commissionPercent: 33.3, tripCount: 15112 },
    { month: "2025-03", farePrice: 328200, revenue: 218800, commission: 109400, commissionPercent: 33.3, tripCount: 16472 },
    { month: "2025-04", farePrice: 317800, revenue: 211800, commission: 106000, commissionPercent: 33.3, tripCount: 16720 },
    { month: "2025-05", farePrice: 343000, revenue: 228700, commission: 114300, commissionPercent: 33.3, tripCount: 18509 },
    { month: "2025-06", farePrice: 257000, revenue: 171300, commission: 85700, commissionPercent: 33.3, tripCount: 13358 },
    { month: "2025-07", farePrice: 282200, revenue: 188100, commission: 94100, commissionPercent: 33.3, tripCount: 14774 },
    { month: "2025-08", farePrice: 322900, revenue: 215300, commission: 107600, commissionPercent: 33.3, tripCount: 16233 },
    { month: "2025-09", farePrice: 294800, revenue: 196500, commission: 98300, commissionPercent: 33.3, tripCount: 13790 },
    { month: "2025-10", farePrice: 275100, revenue: 183400, commission: 91700, commissionPercent: 33.3, tripCount: 14645 },
    { month: "2025-11", farePrice: 254500, revenue: 169700, commission: 84800, commissionPercent: 33.3, tripCount: 14137 },
  ],
};
