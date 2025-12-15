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
