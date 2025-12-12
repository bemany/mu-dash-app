import { UberTrip, UberTransaction } from "./types";
import { subMonths, format, startOfMonth } from "date-fns";

const LICENSE_PLATES = [
  "B-UB 1234", "B-UB 5678", "B-UB 9012", "B-UB 3456", 
  "B-ER 1122", "B-ER 3344", "B-ER 5566", "B-ER 7788",
  "B-TX 9988", "B-TX 7766", "B-TX 5544", "B-TX 3322"
];

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export function generateMockTrips(count: number = 5000): UberTrip[] {
  const trips: UberTrip[] = [];
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);

  for (let i = 0; i < count; i++) {
    const isCompleted = Math.random() > 0.1; // 90% completed
    const date = randomDate(sixMonthsAgo, now);
    
    trips.push({
      "Kennzeichen": LICENSE_PLATES[Math.floor(Math.random() * LICENSE_PLATES.length)],
      "Zeitpunkt der Fahrtbestellung": date.toISOString(),
      "Fahrtstatus": isCompleted ? "completed" : "cancelled",
      "Fahrt-ID": Math.random().toString(36).substring(7),
    });
  }

  return trips;
}

export function generateMockTransactions(): UberTransaction[] {
  const txs: UberTransaction[] = [];
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 6);
  
  // Generate transactions for each month/driver
  for (let i = 0; i < 6; i++) {
     const monthDate = subMonths(now, i);
     
     LICENSE_PLATES.forEach(plate => {
       // Randomly pay some drivers, underpay some, overpay some
       const roll = Math.random();
       let amount = 0;
       
       if (roll > 0.7) amount = 400; // Correct
       else if (roll > 0.4) amount = 250; // Correct lower tier
       else if (roll > 0.2) amount = 200; // Underpaid
       else amount = 0; // Missed
       
       if (amount > 0) {
         txs.push({
           "Kennzeichen": plate,
           "Zeitpunkt": monthDate.toISOString(),
           "Betrag": amount,
           "Beschreibung": "Bonus Zahlung"
         });
       }
     });
  }
  
  return txs;
}
