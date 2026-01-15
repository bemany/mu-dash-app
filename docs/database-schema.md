# MU-Dash Datenbankstruktur

## Übersicht

Die Datenbank besteht aus **6 Tabellen**. Die zentrale Verknüpfung erfolgt über `session_id`.

---

## 1. `sessions` - Benutzersitzungen

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | varchar (UUID) | NOT NULL | Primärschlüssel, automatisch generiert |
| `session_id` | text | NOT NULL | Express-Session-ID (Browser-Cookie), **UNIQUE** |
| `vorgangs_id` | text | NULL | 6-stelliger Code zum Laden (z.B. "J6T68S"), **UNIQUE** |
| `company_name` | text | NULL | Firmenname (aus Payment-CSV extrahiert) |
| `created_at` | timestamp | NOT NULL | Erstellungszeitpunkt |
| `last_activity_at` | timestamp | NOT NULL | Letzte Aktivität |
| `current_step` | integer | NOT NULL | Aktueller Workflow-Schritt (1-3), Default: 1 |

**Verknüpfungen:**
- `sessions.session_id` → `trips.session_id`
- `sessions.session_id` → `transactions.session_id`
- `sessions.session_id` → `uploads.session_id`
- `sessions.vorgangs_id` → `performance_logs.vorgangs_id`
- `sessions.session_id` → `import_logs.session_id`

---

## 2. `trips` - Fahrtdaten

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | varchar (UUID) | NOT NULL | Primärschlüssel (DB-intern) |
| `session_id` | text | NOT NULL | Verknüpfung zur Session |
| `trip_id` | text | NULL | Externe Fahrt-ID aus CSV (oft leer) |
| `license_plate` | text | NOT NULL | Kennzeichen (z.B. "B-ER1234") |
| `order_time` | timestamp | NOT NULL | Zeitpunkt der Fahrtbestellung |
| `trip_status` | text | NOT NULL | Status der Fahrt |
| `raw_data` | jsonb | NULL | Alle Originalfelder aus der CSV |
| `created_at` | timestamp | NOT NULL | Import-Zeitpunkt |

**Unique Index:** `trips_dedup_idx` auf `(session_id, license_plate, order_time)` → Verhindert Duplikate

### trip_status Werte:
- `completed` - Abgeschlossene Fahrt
- `driver_cancelled` - Vom Fahrer storniert
- `rider_cancelled` - Vom Fahrgast storniert
- `failed` - Fehlgeschlagen
- `delivery_failed` - Lieferung fehlgeschlagen

### Wichtige Felder in `raw_data` (jsonb):
| Schlüssel | Beschreibung |
|-----------|--------------|
| `Fahrpreis (Änderungen aufgrund von Anpassungen nach der Fahrt vorbehalten)` | Fahrpreis in € (String, z.B. "12,50") |
| `Fahrtdistanz` | Distanz in km (String, z.B. "5,2") |
| `Startzeit der Fahrt` | ISO-Timestamp Fahrtbeginn |
| `Ankunftszeit der Fahrt` | ISO-Timestamp Fahrtende |
| `Vorname des Fahrers` | Vorname des Fahrers |
| `Nachname des Fahrers` | Nachname des Fahrers |
| `Fahrt-UUID` | UUID für Verknüpfung mit Transaktionen |
| `Zeitpunkt der Fahrtbestellung` | ISO-Timestamp Bestellung |
| `Kennzeichen` | Fahrzeug-Kennzeichen |
| `Fahrtstatus` | Status als String |

---

## 3. `transactions` - Zahlungsdaten

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | varchar (UUID) | NOT NULL | Primärschlüssel |
| `session_id` | text | NOT NULL | Verknüpfung zur Session |
| `license_plate` | text | NOT NULL | Kennzeichen (aus Beschreibung extrahiert) |
| `transaction_time` | timestamp | NOT NULL | Zahlungszeitpunkt |
| `amount` | integer | NOT NULL | Betrag in **Cents** (15000 = 150,00 €) |
| `description` | text | NULL | Beschreibung (enthält Promo-Info) |
| `trip_uuid` | text | NULL | UUID der zugehörigen Fahrt |
| `revenue` | integer | NULL | "Deine Umsätze" in **Cents** |
| `fare_price` | integer | NULL | Fahrpreis in **Cents** |
| `raw_data` | jsonb | NULL | Alle Originalfelder aus der CSV |
| `created_at` | timestamp | NOT NULL | Import-Zeitpunkt |

**Unique Index:** `transactions_dedup_idx` auf `(session_id, license_plate, transaction_time, amount)` → Verhindert Duplikate

### Verknüpfung Trips ↔ Transactions:
```sql
trips.raw_data->>'Fahrt-UUID' = transactions.trip_uuid
```

### Promo-Zahlungen erkennen:
Promo-Zahlungen (Werbegelder) haben in `description`:
- Enthält "fahrzeugbasierte aktion"
- Enthält "fahrten"
- Kennzeichen wird per Regex extrahiert

---

## 4. `uploads` - Original-CSV-Dateien

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | varchar (UUID) | NOT NULL | Primärschlüssel |
| `session_id` | text | NOT NULL | Verknüpfung zur Session |
| `file_type` | text | NOT NULL | "trips" oder "payments" |
| `filename` | text | NOT NULL | Originaler Dateiname |
| `mime_type` | text | NOT NULL | MIME-Typ (text/csv) |
| `size` | integer | NOT NULL | Dateigröße in Bytes |
| `content` | text | NOT NULL | Base64-kodierter Dateiinhalt |
| `created_at` | timestamp | NOT NULL | Upload-Zeitpunkt |

---

## 5. `performance_logs` - Performance-Metriken

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | varchar (UUID) | NOT NULL | Primärschlüssel |
| `vorgangs_id` | text | NULL | Verknüpfung zur Session |
| `operation_type` | text | NOT NULL | "import" oder "load" |
| `software_version` | text | NOT NULL | App-Version (z.B. "2.5.0") |
| `duration_ms` | integer | NOT NULL | Dauer in Millisekunden |
| `trip_count` | integer | NOT NULL | Anzahl verarbeiteter Fahrten, Default: 0 |
| `transaction_count` | integer | NOT NULL | Anzahl verarbeiteter Transaktionen, Default: 0 |
| `records_per_second` | integer | NULL | Durchsatz (Records/Sekunde) |
| `created_at` | timestamp | NOT NULL | Zeitpunkt |

---

## 6. `import_logs` - Detaillierte Import-Logs

| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|--------------|
| `id` | varchar (UUID) | NOT NULL | Primärschlüssel |
| `session_id` | text | NOT NULL | Verknüpfung zur Session |
| `vorgangs_id` | text | NULL | Vorgangs-ID |
| `level` | text | NOT NULL | Log-Level |
| `phase` | text | NOT NULL | Import-Phase |
| `message` | text | NOT NULL | Log-Nachricht |
| `details` | jsonb | NULL | Zusätzliche strukturierte Daten |
| `memory_usage_mb` | integer | NULL | Speicherverbrauch in MB |
| `records_processed` | integer | NULL | Verarbeitete Datensätze |
| `duration_ms` | integer | NULL | Dauer in ms |
| `created_at` | timestamp | NOT NULL | Zeitpunkt |

### level Werte:
- `info` - Information
- `warn` - Warnung
- `error` - Fehler
- `debug` - Debug-Info

### phase Werte:
- `upload` - Datei-Upload
- `parse` - CSV-Parsing
- `validate` - Validierung
- `insert` - Datenbank-Insert
- `complete` - Abgeschlossen
- `error` - Fehler aufgetreten

---

## Beziehungsdiagramm

```
┌─────────────────────────────────────────────────────────────────┐
│                          sessions                                │
│  id | session_id | vorgangs_id | company_name | current_step    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┬───────────────────┐
          │                 │                 │                   │
          ▼                 ▼                 ▼                   ▼
┌─────────────────┐ ┌───────────────┐ ┌─────────────┐ ┌──────────────────┐
│     trips       │ │ transactions  │ │   uploads   │ │ performance_logs │
│                 │ │               │ │             │ │                  │
│ session_id (FK) │ │ session_id(FK)│ │session_id   │ │ vorgangs_id (FK) │
│ license_plate   │ │ license_plate │ │ file_type   │ │ operation_type   │
│ order_time      │ │ trip_uuid ────┼─┤ content     │ │ duration_ms      │
│ trip_status     │ │ amount        │ │             │ │ trip_count       │
│ raw_data        │ │ revenue       │ └─────────────┘ └──────────────────┘
│   └─ Fahrt-UUID─┼─┤ fare_price    │
└─────────────────┘ │ raw_data      │
                    └───────────────┘
                            │
                            │ vorgangs_id
                            ▼
                    ┌───────────────┐
                    │  import_logs  │
                    │               │
                    │ session_id    │
                    │ vorgangs_id   │
                    │ level, phase  │
                    │ message       │
                    └───────────────┘
```

---

## Wichtige Abfrage-Beispiele

### Session mit Statistiken laden:
```sql
SELECT 
  s.*,
  (SELECT COUNT(*) FROM trips WHERE session_id = s.session_id) as trip_count,
  (SELECT COUNT(*) FROM transactions WHERE session_id = s.session_id) as transaction_count
FROM sessions s 
WHERE vorgangs_id = 'J6T68S';
```

### Alle abgeschlossenen Fahrten einer Session:
```sql
SELECT * FROM trips 
WHERE session_id = 'xxx' 
  AND trip_status = 'completed'
ORDER BY order_time;
```

### Abgeschlossene Fahrten pro Fahrzeug/Monat:
```sql
SELECT 
  license_plate,
  TO_CHAR(order_time, 'YYYY-MM') as month,
  COUNT(*) as trip_count
FROM trips 
WHERE session_id = 'xxx' 
  AND trip_status = 'completed'
GROUP BY license_plate, TO_CHAR(order_time, 'YYYY-MM')
ORDER BY license_plate, month;
```

### Promo-Zahlungen (Werbegelder) finden:
```sql
SELECT 
  license_plate,
  TO_CHAR(transaction_time, 'YYYY-MM') as month,
  SUM(amount) / 100.0 as total_paid_euros
FROM transactions 
WHERE session_id = 'xxx' 
  AND description ILIKE '%fahrzeugbasierte aktion%'
GROUP BY license_plate, TO_CHAR(transaction_time, 'YYYY-MM');
```

### Umsatz pro Fahrzeug:
```sql
SELECT 
  t.license_plate,
  COUNT(DISTINCT t.id) as completed_trips,
  SUM(tx.revenue) / 100.0 as total_revenue_euros
FROM trips t
LEFT JOIN transactions tx ON t.raw_data->>'Fahrt-UUID' = tx.trip_uuid 
  AND tx.session_id = t.session_id
WHERE t.session_id = 'xxx' 
  AND t.trip_status = 'completed'
GROUP BY t.license_plate;
```

### Fahrer-Statistiken:
```sql
SELECT 
  raw_data->>'Vorname des Fahrers' as first_name,
  raw_data->>'Nachname des Fahrers' as last_name,
  COUNT(*) FILTER (WHERE trip_status = 'completed') as completed_trips,
  COUNT(*) FILTER (WHERE trip_status IN ('driver_cancelled', 'rider_cancelled')) as cancelled_trips
FROM trips 
WHERE session_id = 'xxx'
  AND raw_data->>'Vorname des Fahrers' IS NOT NULL
GROUP BY 
  raw_data->>'Vorname des Fahrers', 
  raw_data->>'Nachname des Fahrers';
```

### Performance-Logs einer Session:
```sql
SELECT * FROM performance_logs 
WHERE vorgangs_id = 'J6T68S'
ORDER BY created_at DESC;
```

---

## Prämien-Berechnung (Business-Logik)

Werbeprämien werden pro Fahrzeug und Monat berechnet:

| Abgeschlossene Fahrten | Theoretische Prämie |
|------------------------|---------------------|
| ≥ 700 Fahrten          | 400 € |
| ≥ 250 Fahrten          | 150 € |
| < 250 Fahrten          | 0 € |

```sql
-- Prämien-Berechnung
SELECT 
  license_plate,
  TO_CHAR(order_time, 'YYYY-MM') as month,
  COUNT(*) as trip_count,
  CASE 
    WHEN COUNT(*) >= 700 THEN 400
    WHEN COUNT(*) >= 250 THEN 150
    ELSE 0
  END as theoretical_bonus
FROM trips 
WHERE session_id = 'xxx' 
  AND trip_status = 'completed'
GROUP BY license_plate, TO_CHAR(order_time, 'YYYY-MM');
```

---

## Hinweise für KI-Agent

1. **Alle Geldbeträge in transactions sind in Cents gespeichert** - Durch 100 teilen für Euro
2. **trip_id kann NULL sein** - Verwende `trips.id` für eindeutige Identifikation
3. **Promo-Zahlungen erkennen:** `description ILIKE '%fahrzeugbasierte aktion%'`
4. **Verknüpfung Trips ↔ Transactions:** `trips.raw_data->>'Fahrt-UUID' = transactions.trip_uuid`
5. **Nur completed Fahrten für Berichte:** Filter `trip_status = 'completed'`
6. **Kennzeichen normalisieren:** `UPPER(REPLACE(license_plate, ' ', ''))`
