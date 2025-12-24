import { subMonths, format, addMonths } from "date-fns";

const today = new Date();
const performanceThisMonth = format(today, "yyyy-MM");
const performanceLastMonth = format(subMonths(today, 1), "yyyy-MM");

const DEMO_VEHICLES = [
  { plate: "B-MU 1001", trips: 892, fare: 16186 },
  { plate: "B-MU 1002", trips: 845, fare: 15337 },
  { plate: "B-MU 1003", trips: 818, fare: 14847 },
  { plate: "B-MU 1004", trips: 790, fare: 14338 },
  { plate: "B-MU 1005", trips: 775, fare: 14066 },
  { plate: "B-MU 1006", trips: 757, fare: 13739 },
  { plate: "B-MU 1007", trips: 743, fare: 13485 },
  { plate: "B-MU 1008", trips: 720, fare: 13068 },
  { plate: "B-MU 1009", trips: 708, fare: 12850 },
  { plate: "B-MU 1010", trips: 695, fare: 12614 },
  { plate: "B-MU 1011", trips: 685, fare: 12432 },
  { plate: "B-MU 1012", trips: 674, fare: 12233 },
  { plate: "B-MU 1013", trips: 660, fare: 11979 },
  { plate: "B-MU 1014", trips: 651, fare: 11816 },
  { plate: "B-MU 1015", trips: 638, fare: 11580 },
  { plate: "B-MU 1016", trips: 621, fare: 11271 },
  { plate: "B-MU 1017", trips: 598, fare: 10854 },
  { plate: "B-MU 1018", trips: 571, fare: 10364 },
  { plate: "B-MU 1019", trips: 496, fare: 9002 },
];

const DEMO_DRIVERS = [
  { name: "Max Müller", trips: 580, fare: 6960, cancelled: 40 },
  { name: "Thomas Schmidt", trips: 545, fare: 6540, cancelled: 38 },
  { name: "Stefan Weber", trips: 520, fare: 6240, cancelled: 36 },
  { name: "Michael Fischer", trips: 505, fare: 6060, cancelled: 35 },
  { name: "Andreas Wagner", trips: 490, fare: 5880, cancelled: 34 },
  { name: "Peter Becker", trips: 475, fare: 5700, cancelled: 33 },
  { name: "Klaus Hoffmann", trips: 460, fare: 5520, cancelled: 32 },
  { name: "Jürgen Schäfer", trips: 445, fare: 5340, cancelled: 31 },
  { name: "Markus Koch", trips: 430, fare: 5160, cancelled: 30 },
  { name: "Rainer Bauer", trips: 415, fare: 4980, cancelled: 29 },
  { name: "Frank Richter", trips: 400, fare: 4800, cancelled: 28 },
  { name: "Uwe Klein", trips: 385, fare: 4620, cancelled: 27 },
  { name: "Bernd Wolf", trips: 370, fare: 4440, cancelled: 26 },
  { name: "Wolfgang Schröder", trips: 360, fare: 4320, cancelled: 25 },
  { name: "Dieter Neumann", trips: 350, fare: 4200, cancelled: 24 },
  { name: "Horst Schwarz", trips: 340, fare: 4080, cancelled: 24 },
  { name: "Werner Zimmermann", trips: 330, fare: 3960, cancelled: 23 },
  { name: "Günter Braun", trips: 320, fare: 3840, cancelled: 22 },
  { name: "Helmut Krüger", trips: 310, fare: 3720, cancelled: 21 },
  { name: "Manfred Hartmann", trips: 300, fare: 3600, cancelled: 21 },
  { name: "Hans Lange", trips: 290, fare: 3480, cancelled: 20 },
  { name: "Karl Werner", trips: 280, fare: 3360, cancelled: 19 },
  { name: "Gerhard Schmitt", trips: 270, fare: 3240, cancelled: 19 },
  { name: "Walter Meier", trips: 260, fare: 3120, cancelled: 18 },
  { name: "Herbert Schulz", trips: 250, fare: 3000, cancelled: 17 },
  { name: "Ernst Maier", trips: 240, fare: 2880, cancelled: 17 },
  { name: "Otto König", trips: 235, fare: 2820, cancelled: 16 },
  { name: "Friedrich Mayer", trips: 230, fare: 2760, cancelled: 16 },
  { name: "Wilhelm Huber", trips: 225, fare: 2700, cancelled: 15 },
  { name: "Heinrich Kaiser", trips: 220, fare: 2640, cancelled: 15 },
  { name: "Rudolf Peters", trips: 215, fare: 2580, cancelled: 15 },
  { name: "Josef Lang", trips: 210, fare: 2520, cancelled: 14 },
  { name: "Ludwig Jung", trips: 205, fare: 2460, cancelled: 14 },
  { name: "Albert Fuchs", trips: 200, fare: 2400, cancelled: 14 },
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
  totalActiveDays?: number;
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

const totalTrips = 14137;
const totalFare = 256316.55;
const totalRevenue = 169647.44;
const totalDistance = 137924;
const totalShifts = 828;
const totalHoursWorked = 4242;

export const mockDriverReport: { summary: DriverReportSummary; drivers: DriverReportRow[] } = {
  summary: {
    totalRevenue: totalRevenue,
    totalDistance: totalDistance,
    totalHoursWorked: totalHoursWorked,
    totalTrips: totalTrips,
    totalShifts: totalShifts,
    uniqueDrivers: 34,
    totalActiveDays: 805,
    avgRevenuePerHour: 40.00,
    avgRevenuePerDay: 210.64,
    avgRevenuePerMonth: totalRevenue,
    avgRevenuePerKm: 1.23,
    avgRevenuePerTrip: 12.00,
    avgRevenuePerDriver: 4989.63,
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
    avgRevenuePerHour: 40.00,
    avgRevenuePerDay: 210.64,
    avgRevenuePerMonth: totalRevenue,
    avgRevenuePerKm: 1.23,
    avgRevenuePerTrip: 12.00,
    avgRevenuePerVehicle: 8929.34,
    avgOccupancyRate: 79.9,
    totalActiveDays: 805,
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
    totalTheoreticalBonus: 119450,
    totalActualPaid: 41000,
    totalDifference: -78450,
    totalTrips: totalTrips,
    licensePlateCount: 19,
    monthCount: 1,
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
    commissionPercent: 33.8,
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
