# MU-Dash (Mietwagenunternehmer Dashboard)

## Overview

MU-Dash is a multi-language web application for managing driver bonuses and promotional rewards. It provides a multi-step workflow for uploading trip data and payment transactions, calculating expected bonuses, and reconciling actual payments against theoretical earnings. The application tracks sessions to maintain user progress across the workflow steps.

### Multi-Language Support
- Supported languages: German (DE), English (EN), Turkish (TR), Arabic (AR)
- Language switcher with country flags in sidebar
- RTL support for Arabic
- Translation system in `client/src/i18n/`

### Additional Data Upload
- Users can add more data to an existing session in steps 2/3
- "Weitere Daten hinzufügen" button in header opens upload dialog
- Backend duplicate prevention:
  - Trips: Deduplication by tripId or licensePlate+orderTime
  - Transactions: Deduplication by licensePlate+transactionTime+amount
  - Same-batch duplicates are also prevented

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme configuration
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a pages-based structure with shared components. Key pages include a Dashboard (main workflow) and Admin page (session management).

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Session Management**: Express sessions with custom session IDs stored in database

The backend serves both the API and static files in production. In development, Vite handles the frontend with HMR.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema**: Three main tables:
  - `sessions` - Tracks user workflow progress, includes vorgangsId for session retrieval
  - `trips` - Stores uploaded trip data with license plates and timestamps
  - `transactions` - Stores payment transaction records

### Vorgangs-ID Feature
Each session receives a unique 6-character Vorgangs-ID (e.g., "A7C8RU") after uploading data:
- **Format**: 6 uppercase alphanumeric characters (excluding ambiguous: 0, O, I, L, 1)
- **Generation**: Automatic after data upload via POST `/api/session/vorgangsid`
- **Loading**: Users can load existing sessions via POST `/api/session/load` with their Vorgangs-ID
- **Display**: Shown prominently in steps 2/3 with copy-to-clipboard functionality
- **Reset behavior**: When session is reset, Vorgangs-ID is cleared (old ID becomes invalid)

### Admin Access
- **Path**: /admin
- **Authentication**: Password-protected via ADMIN_PASSWORD environment variable
- **Endpoints**: All /api/admin/* endpoints require authentication via session
- **Login**: POST /api/admin/login with { password: string }
- **Check**: GET /api/admin/check returns { isAdmin: boolean }

### Routing
- **/** - Performance Dashboard (home page with demo data if no session loaded)
- **/performance** - Same as above
- **/import** - Simplified upload page for CSV files
- **/v/:vorgangsId** - Load session by Vorgangs-ID
- **/help** - Help page
- **/updates** - Updates page
- **/admin** - Admin panel

### Customer Journey (New)
1. User visits platform → sees Performance Dashboard with demo data
2. User clicks "Datenimport starten" button → redirected to /import
3. User uploads CSV files (drag & drop or file picker)
4. Files are processed on the SERVER (parallel processing for speed)
5. After upload → automatic redirect to Performance Dashboard with Vorgangs-ID displayed
6. User can navigate via KPI tiles to see detailed bonus analysis

### Demo Mode
- Performance Dashboard shows demo data automatically when no Vorgangs-ID is loaded
- Demo mode displays a yellow banner with "Datenimport starten" button
- When session has data, shows green banner with Vorgangs-ID and copy button
- Mock data includes realistic German driver data with KPIs, shifts, and bonus payouts
- Mock data file: `client/src/lib/mock-data.ts`

### Data Flow (Server-Side Processing)
1. User drops/selects CSV files on the upload page
2. Files are sent directly to POST `/api/upload` as multipart/form-data
3. Server parses CSVs using PapaParse (no client-side parsing)
4. Trip and payment files are detected by header columns
5. Files are processed IN PARALLEL for faster processing
6. Progress is broadcast via WebSocket to the client
7. Deduplication prevents duplicate entries
8. Vorgangs-ID is generated automatically
9. User is redirected to dashboard with their Vorgangs-ID

### CSV Formats
- **Trips CSV**: Must have "Kennzeichen", "Zeitpunkt der Fahrtbestellung", "Fahrtstatus" columns
- **Payments CSV**: Uses "Beschreibung" (to extract license plate via regex), "An dein Unternehmen gezahlt" (amount), "vs-Berichterstattung" (timestamp), "Name des Unternehmens" (company name - stored with session)

### Company Name Feature
- Company name is automatically extracted from the "Name des Unternehmens" column in payment CSVs
- Stored in the sessions table under `company_name` column
- Displayed in admin panel next to the Vorgangs-ID for each session
- Helps identify which company a session belongs to

### Performance Dashboard
- Available at `/performance` when a session has trip data loaded
- **KPI Tiles** with clickable drill-down modals:
  - €/Stunde (revenue per hour worked)
  - €/km (revenue per kilometer driven)
  - €/Tag (average revenue per day)
  - €/Fahrer (revenue per driver - from rawData "Vorname/Nachname des Fahrers")
  - €/Fahrzeug (revenue per vehicle - license plate)
  - Schichten (shift analysis with day/night breakdown)
- **Smart Date Range Picker**:
  - Queries available data range from backend via GET `/api/performance/daterange`
  - Auto-selects the last complete month with data (not current month)
  - Dynamically generates month presets based on available data
  - Month names are localized across all 4 languages (Januar, Ocak, يناير, January)
  - "All Data" preset added when multiple months are available
  - In demo mode, shows basic presets (Last Month, This Year)
- **Shift Detection Logic**:
  - 5-hour gap between trips = new shift
  - Shift classification: Day (6-18h) vs Night (18-6h) based on weighted trip duration
  - Groups trips by driver+vehicle combination
- **API Endpoints**:
  - GET `/api/performance/kpis` - Totals with byDay/byMonth breakdowns
  - GET `/api/performance/drivers` - Per-driver breakdown
  - GET `/api/performance/vehicles` - Per-vehicle breakdown
  - GET `/api/performance/shifts` - Shift analysis with summary
- **Data from rawData**: Fahrtdistanz (km), Fahrpreis (€), Startzeit/Ankunftszeit, Vorname/Nachname des Fahrers
- **Multi-language**: Translations for DE, EN, TR, AR

### Excel Export
- Two export buttons available:
  - **Summary Export**: "Als Excel exportieren" button exports the evaluation table with all license plates, trip counts, bonuses, payments, and differences per month
  - **Payments Export**: In the payments dialog, exports all matched and unmatched payments
- Files are named with the Vorgangs-ID (e.g., `Auswertung_ABC123.xlsx`)

### Original File Storage
- Original CSV files are stored in database when uploaded
- Files stored as base64 in the `uploads` table with metadata (filename, type, size, createdAt)
- Maximum file size: 10MB per file
- Admin panel shows uploaded files in session details with download button
- Files are grouped by type (trips/payments) with icons and metadata display

### Build System
- Client builds to `dist/public` via Vite
- Server bundles to `dist/index.cjs` via esbuild
- Selective dependency bundling to optimize cold start times

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations stored in `/migrations` directory

### Third-Party Libraries
- **PapaParse**: CSV file parsing on the client
- **date-fns**: Date manipulation and formatting (with German locale support)
- **Radix UI**: Accessible UI component primitives
- **TanStack Query**: Data fetching and caching

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling
- `@replit/vite-plugin-dev-banner`: Development environment indicator
- Custom meta images plugin for OpenGraph tags with Replit deployment URLs