# MU-Dash Kalkulationen und Business-Logik

## Übersicht

Dieses Dokument beschreibt alle Berechnungen, die in den KPI-Kacheln und Reports verwendet werden.

---

## 1. Datenquellen und Verknüpfungen

### Trips ↔ Transactions Verknüpfung
```sql
trips.raw_data->>'Fahrt-UUID' = transactions.trip_uuid
```

### Wichtige Datenfelder aus `trips.raw_data`

| Feld | Beschreibung | Format |
|------|-------------|--------|
| `Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)` | Kundenpreis | String mit Komma (z.B. "12,50") |
| `Fahrtdistanz` | Distanz in km | String mit Komma (z.B. "5,2") |
| `Startzeit der Fahrt` | Fahrt-Start | ISO-Timestamp |
| `Ankunftszeit der Fahrt` | Fahrt-Ende | ISO-Timestamp |
| `Vorname des Fahrers` / `Nachname des Fahrers` | Fahrername | String |
| `Fahrt-UUID` | Verknüpfung zu Transaktionen | UUID-String |

### Wichtige Datenfelder aus `transactions`

| Feld | Beschreibung | Format |
|------|-------------|--------|
| `revenue` | Deine Umsätze (was du erhältst) | Integer in **Cents** |
| `fare_price` | Fahrpreis | Integer in **Cents** |
| `amount` | Betrag (für Promo-Zahlungen) | Integer in **Cents** |
| `trip_uuid` | Verknüpfung zu Fahrten | UUID-String |

---

## 2. Schicht-Erkennung (Shift Detection)

### Logik
Eine **neue Schicht** beginnt, wenn:
- Es die erste Fahrt ist (keine vorherige Fahrt)
- ODER mehr als **5 Stunden** seit der letzten Fahrt vergangen sind

### Tag vs. Nacht
| Typ | Startzeit |
|-----|-----------|
| **Tag-Schicht** | 06:00 - 17:59 Uhr |
| **Nacht-Schicht** | 18:00 - 05:59 Uhr |

### SQL-Logik
```sql
CASE 
  WHEN LAG(order_time) OVER (PARTITION BY license_plate ORDER BY order_time) IS NULL 
    OR EXTRACT(EPOCH FROM (order_time - LAG(order_time) OVER (...))) / 3600 > 5
  THEN 1  -- Neue Schicht
  ELSE 0
END as is_new_shift

CASE 
  WHEN EXTRACT(HOUR FROM start_time) >= 6 AND EXTRACT(HOUR FROM start_time) < 18 
  THEN 'day'
  ELSE 'night'
END as shift_type
```

---

## 3. Fahrer-Report Kalkulationen

### Abfrage-Struktur
```sql
-- CTE 1: trip_data - Rohdaten aus trips + transactions
-- CTE 2: trip_with_shift_type - Tag/Nacht-Klassifikation
-- CTE 3: shift_detection - Schicht-Grenzen erkennen
-- CTE 4: driver_metrics - Aggregation pro Fahrer
```

### Metriken pro Fahrer

| Metrik | Formel |
|--------|--------|
| `completed_trips` | `COUNT(DISTINCT row_id) WHERE status = 'completed'` |
| `cancelled_trips` | `COUNT(DISTINCT row_id) WHERE status IN ('driver_cancelled', 'rider_cancelled', 'failed', 'delivery_failed')` |
| `total_trips` | `COUNT(DISTINCT row_id)` |
| `total_fare` | `SUM(fare) WHERE status = 'completed'` |
| `total_revenue` | `SUM(revenue) WHERE status = 'completed'` |
| `total_distance` | `SUM(distance_m)` -- in km |
| `total_hours` | `SUM(trip_hours)` |
| `shift_count` | `SUM(is_new_shift)` |
| `day_shift_count` | `SUM(is_new_shift) WHERE shift_type = 'day'` |
| `night_shift_count` | `SUM(is_new_shift) WHERE shift_type = 'night'` |
| `active_days` | `COUNT(DISTINCT DATE(order_time))` |
| `active_months` | `COUNT(DISTINCT TO_CHAR(order_time, 'YYYY-MM'))` |

### Berechnete KPIs pro Fahrer

| KPI | Formel |
|-----|--------|
| `avg_fare_per_trip` | `total_fare / completed_trips` |
| `avg_revenue_per_trip` | `total_revenue / completed_trips` |
| `price_per_km` | `total_revenue / total_distance` |
| `revenue_per_day` | `total_revenue / active_days` |
| `revenue_per_hour` | `total_revenue / total_hours` |
| `trips_per_hour` | `completed_trips / total_hours` |
| `acceptance_rate` | `(completed_trips / total_trips) * 100` |

### Summary-Metriken (alle Fahrer)

| KPI | Formel |
|-----|--------|
| `avgRevenuePerHour` | `totalRevenue / totalHoursWorked` |
| `avgRevenuePerDay` | `totalRevenue / totalActiveDays` |
| `avgRevenuePerMonth` | `totalRevenue / totalActiveMonths` |
| `avgRevenuePerKm` | `totalRevenue / totalDistance` |
| `avgRevenuePerTrip` | `totalRevenue / totalTrips` |
| `avgRevenuePerDriver` | `totalRevenue / uniqueDrivers` |

---

## 4. Fahrzeug-Report Kalkulationen

### Identisch zu Fahrer-Report, aber:
- Gruppierung nach `license_plate` statt `first_name, last_name`
- Kennzeichen werden normalisiert: `UPPER(TRIM(REPLACE(license_plate, ' ', '')))`

### Zusätzliche Metriken

| Metrik | Formel |
|--------|--------|
| `day_revenue` | `SUM(revenue) WHERE status = 'completed' AND shift_type = 'day'` |
| `night_revenue` | `SUM(revenue) WHERE status = 'completed' AND shift_type = 'night'` |

### Besetzungsquote (Occupancy Rate)

Misst, wie viele Fahrer ein Fahrzeug pro Tag nutzen (max. 2 erwartet).

```sql
WITH daily_drivers AS (
  SELECT 
    license_plate,
    DATE(order_time) as trip_date,
    COUNT(DISTINCT CONCAT(first_name, ' ', last_name)) as driver_count
  FROM trips
  GROUP BY license_plate, DATE(order_time)
)
SELECT 
  license_plate,
  AVG(LEAST(driver_count, 2) / 2.0 * 100) as occupancy_rate
FROM daily_drivers
GROUP BY license_plate
```

**Interpretation:**
- 1 Fahrer/Tag = 50% Besetzung
- 2+ Fahrer/Tag = 100% Besetzung

---

## 5. Werbegelder (Promo) Report

### Prämien-Staffelung

| Abgeschlossene Fahrten/Monat | Theoretische Prämie |
|------------------------------|---------------------|
| ≥ 700 | **400 €** |
| ≥ 250 | **150 €** |
| < 250 | 0 € |

### Berechnung

```sql
-- Schritt 1: Fahrten pro Fahrzeug/Monat zählen
SELECT 
  UPPER(TRIM(REPLACE(license_plate, ' ', ''))) as licensePlate,
  TO_CHAR(order_time, 'YYYY-MM') as month,
  COUNT(*) as count
FROM trips
WHERE session_id = ? AND LOWER(trip_status) = 'completed'
GROUP BY licensePlate, month

-- Schritt 2: Tatsächliche Zahlungen aggregieren
SELECT 
  UPPER(TRIM(REPLACE(license_plate, ' ', ''))) as license_plate,
  TO_CHAR(transaction_time, 'YYYY-MM') as month,
  SUM(amount) / 100 as total_paid  -- Cents → Euro
FROM transactions
WHERE session_id = ?
GROUP BY license_plate, month
```

### Promo-Zahlungen erkennen (bei Import)

Promo-Zahlungen werden an `description` erkannt:
```javascript
function isPromoPayment(description) {
  const lower = description.toLowerCase();
  return lower.includes("fahrzeugbasierte aktion") && lower.includes("fahrten");
}
```

### KPIs

| KPI | Formel |
|-----|--------|
| `theoreticalBonus` | Staffelung basierend auf `tripCount` |
| `actualPaid` | `SUM(amount)` für Fahrzeug/Monat |
| `difference` | `theoreticalBonus - actualPaid` |

### Summary

| KPI | Formel |
|-----|--------|
| `totalTheoreticalBonus` | `SUM(theoreticalBonus)` über alle Zeilen |
| `totalActualPaid` | `SUM(actualPaid)` über alle Zeilen |
| `totalDifference` | `SUM(difference)` über alle Zeilen |
| `totalTrips` | `SUM(tripCount)` über alle Zeilen |

---

## 6. Provisions-Analyse (Commission)

### Konzept

| Begriff | Beschreibung |
|---------|-------------|
| `farePrice` | Was der Kunde zahlt (Fahrpreis) |
| `revenue` | Was du erhältst (Deine Umsätze) |
| `commission` | Was Uber behält: `farePrice - revenue` |
| `commissionPercent` | `(commission / farePrice) * 100` |

### Datenquellen

1. **Fahrpreis** aus `trips.raw_data`:
   - Feld: `Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)`

2. **Umsatz** aus `transactions`:
   - Feld: `revenue` (in Cents)
   - **Nur** Transaktionen mit `Beschreibung = 'trip completed order'`
   - Keine Trinkgelder/Anpassungen (`trip fare adjust order` werden ignoriert)

### Deduplizierung

Pro `trip_uuid` wird nur **eine** Transaction verwendet (die neueste):
```sql
SELECT DISTINCT ON (trip_uuid) trip_uuid, revenue
FROM transactions
WHERE raw_data->>'Beschreibung' = 'trip completed order'
ORDER BY trip_uuid, transaction_time DESC
```

### Aggregationen

| Gruppierung | Aggregation |
|-------------|-------------|
| `byMonth` | Fahrpreis, Umsatz, Provision pro Monat |
| `byVehicle` | Fahrpreis, Umsatz, Provision pro Fahrzeug |
| `byDriver` | Fahrpreis, Umsatz, Provision pro Fahrer |

### Summary

| KPI | Formel |
|-----|--------|
| `totalFarePrice` | `SUM(farePrice)` aller Fahrten |
| `totalRevenue` | `SUM(revenue)` aller Fahrten |
| `totalCommission` | `totalFarePrice - totalRevenue` |
| `commissionPercent` | `(totalCommission / totalFarePrice) * 100` |
| `tripCount` | Anzahl Fahrten mit Provisionsdaten |

---

## 7. Unternehmens-Tab KPIs

### Umsatz-KPIs

| KPI | Quelle | Formel |
|-----|--------|--------|
| Gesamtumsatz (Fahrpreis) | Commission | `summary.totalFarePrice` |
| Dein Umsatz | Commission | `summary.totalRevenue` |
| €/Fahrt | Commission | `totalRevenue / tripCount` |
| €/km | Driver Report | `summary.avgRevenuePerKm` |

### Provisions-KPIs

| KPI | Formel |
|-----|--------|
| Provision % | `commissionPercent` |
| Provision gesamt | `totalFarePrice - totalRevenue` |
| Überschuss-Provision | `((actualPercent - expectedPercent) / 100) * totalFarePrice` |

### Werbegelder-KPIs

| KPI | Quelle |
|-----|--------|
| Verdiente Prämien | `promoData.summary.totalTheoreticalBonus` |
| Ausgezahlte Prämien | `promoData.summary.totalActualPaid` |
| Differenz | `promoData.summary.totalDifference` |

### Performance-KPIs

| KPI | Quelle | Formel |
|-----|--------|--------|
| Schichten | Driver Report | `summary.totalShifts` |
| Fahrten | Commission | `summary.tripCount` |
| Stornoquote | Berechnet | `(cancelled / (completed + cancelled)) * 100` |
| Besetzungsquote | Vehicle Report | `summary.avgOccupancyRate` |
| Bereinigter Umsatz/Tag | Driver Report | `totalRevenue / totalActiveDays` |

---

## 8. Zeit-Berechnungen

### Fahrtdauer
```sql
EXTRACT(EPOCH FROM (
  (raw_data->>'Ankunftszeit der Fahrt')::timestamp - 
  (raw_data->>'Startzeit der Fahrt')::timestamp
)) / 3600 as trip_hours
```

### Aktive Tage/Monate
```sql
COUNT(DISTINCT DATE(order_time)) as active_days
COUNT(DISTINCT TO_CHAR(order_time, 'YYYY-MM')) as active_months
```

---

## 9. Datumsfilter

### SQL-Builder
```typescript
buildTripDateFilter(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) return sql``;
  if (startDate && endDate) {
    return sql`AND t.order_time >= ${startDate} AND t.order_time <= ${endDate}`;
  }
  if (startDate) {
    return sql`AND t.order_time >= ${startDate}`;
  }
  return sql`AND t.order_time <= ${endDate}`;
}
```

### Anwendung auf Transactions (Commission)
Transactions werden über die verknüpfte `trips.order_time` gefiltert, nicht über `transaction_time`.

---

## 10. Normalisierung

### Kennzeichen
```sql
UPPER(TRIM(REPLACE(license_plate, ' ', '')))
```
Beispiel: `"B-ER 1234"` → `"B-ER1234"`

### Fahrpreis/Distanz (String → Zahl)
```sql
REPLACE(raw_data->>'Fahrpreis...', ',', '.')::numeric
```
Beispiel: `"12,50"` → `12.50`

### Beträge (Cents → Euro)
```sql
amount / 100.0 as amount_euros
revenue / 100.0 as revenue_euros
```

---

## 11. Status-Filter

### Abgeschlossene Fahrten
```sql
WHERE LOWER(trip_status) = 'completed'
```

### Stornierte Fahrten
```sql
WHERE status IN ('driver_cancelled', 'rider_cancelled', 'failed', 'delivery_failed')
```

---

## 12. Wichtige SQL-Abfragen für KI-Agent

### Umsatz pro Stunde
```sql
SELECT 
  SUM(tx.revenue) / 100.0 / NULLIF(SUM(
    EXTRACT(EPOCH FROM (
      (t.raw_data->>'Ankunftszeit der Fahrt')::timestamp - 
      (t.raw_data->>'Startzeit der Fahrt')::timestamp
    )) / 3600
  ), 0) as revenue_per_hour
FROM trips t
LEFT JOIN transactions tx ON t.raw_data->>'Fahrt-UUID' = tx.trip_uuid
WHERE t.session_id = ?
  AND t.trip_status = 'completed'
```

### Prämien-Differenz berechnen
```sql
WITH trip_counts AS (
  SELECT 
    UPPER(TRIM(REPLACE(license_plate, ' ', ''))) as plate,
    TO_CHAR(order_time, 'YYYY-MM') as month,
    COUNT(*) as trips
  FROM trips
  WHERE session_id = ? AND trip_status = 'completed'
  GROUP BY plate, month
),
payments AS (
  SELECT 
    UPPER(TRIM(REPLACE(license_plate, ' ', ''))) as plate,
    TO_CHAR(transaction_time, 'YYYY-MM') as month,
    SUM(amount) / 100.0 as paid
  FROM transactions
  WHERE session_id = ?
  GROUP BY plate, month
)
SELECT 
  tc.plate,
  tc.month,
  tc.trips,
  CASE WHEN tc.trips >= 700 THEN 400 WHEN tc.trips >= 250 THEN 150 ELSE 0 END as theoretical,
  COALESCE(p.paid, 0) as actual_paid,
  CASE WHEN tc.trips >= 700 THEN 400 WHEN tc.trips >= 250 THEN 150 ELSE 0 END - COALESCE(p.paid, 0) as difference
FROM trip_counts tc
LEFT JOIN payments p ON tc.plate = p.plate AND tc.month = p.month
ORDER BY tc.plate, tc.month
```

### Schichten pro Fahrzeug
```sql
WITH ordered_trips AS (
  SELECT 
    license_plate,
    order_time,
    LAG(order_time) OVER (PARTITION BY license_plate ORDER BY order_time) as prev_time
  FROM trips
  WHERE session_id = ? AND trip_status = 'completed'
)
SELECT 
  license_plate,
  COUNT(*) FILTER (WHERE prev_time IS NULL OR EXTRACT(EPOCH FROM (order_time - prev_time)) / 3600 > 5) as shift_count
FROM ordered_trips
GROUP BY license_plate
```

---

## 13. Hinweise für KI-Agent

1. **Alle Geldbeträge in `transactions` sind in Cents** - Immer durch 100 teilen
2. **Fahrpreis in `trips.raw_data` ist String mit Komma** - Komma durch Punkt ersetzen, dann parsen
3. **Fahrtdistanz ist in km, nicht Metern** - Trotz Feldname "Fahrtdistanz"
4. **Nur `completed` Fahrten für Berechnungen** - Stornierte werden separat gezählt
5. **Schicht = 5 Stunden Pause** - Neue Schicht nach 5h Inaktivität
6. **Tag = 06:00-17:59, Nacht = 18:00-05:59**
7. **Besetzungsquote max 100%** - Auch bei mehr als 2 Fahrern/Tag
8. **Promo-Zahlungen** haben "fahrzeugbasierte aktion" und "fahrten" in der Beschreibung
