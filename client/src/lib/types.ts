export interface UberTrip {
  "Kennzeichen": string;
  "Zeitpunkt der Fahrtbestellung": string; // ISO date string or similar
  "Fahrtstatus": "completed" | "cancelled" | "driver_cancelled";
  "Fahrt-ID"?: string;
  [key: string]: any;
}

export interface UberTransaction {
  "Kennzeichen": string;
  "Zeitpunkt": string; // Date of payment
  "Betrag": number;
  "Beschreibung"?: string;
  "Firmenname"?: string;
  [key: string]: any;
}

export interface MonthlyStats {
  monthKey: string; // e.g., "2024-09"
  count: number;
  bonus: number; // Theoretical bonus
  paidAmount: number; // Actual paid amount
  difference: number; // bonus - paidAmount
}

export interface DriverSummary {
  licensePlate: string;
  stats: Record<string, MonthlyStats>; // Keyed by monthKey
  totalCount: number;
  totalBonus: number;
  totalPaid: number;
  totalDifference: number;
}
