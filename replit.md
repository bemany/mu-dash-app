# Uber-Retter

## Overview

Uber-Retter is a German-language web application for managing driver bonuses and promotional rewards. It provides a multi-step workflow for uploading trip data and payment transactions, calculating expected bonuses, and reconciling actual payments against theoretical earnings. The application tracks sessions to maintain user progress across the workflow steps.

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

### Workflow Steps
The application follows a 3-step workflow:
1. **Daten Import** - Upload both trip and payment CSV files (multiple files supported for each)
2. **Kalkulation** - View calculated bonuses based on trip counts per month
3. **Abgleich** - Compare expected bonuses against actual payments received

### Data Flow
1. Users upload CSV files on step 1 (both trips and payments can be uploaded together)
2. Data is parsed client-side using PapaParse with multiple file support
3. Payment CSVs are processed to extract license plates from "Beschreibung" field
4. Parsed data is sent to backend and stored in PostgreSQL
5. Processing logic calculates bonuses: >249 trips/month = €250, >699 trips/month = €400
6. Results are displayed in a data table comparing expected vs actual payments

### CSV Formats
- **Trips CSV**: Must have "Kennzeichen", "Zeitpunkt der Fahrtbestellung", "Fahrtstatus" columns
- **Payments CSV**: Uses "Beschreibung" (to extract license plate via regex), "An dein Unternehmen gezahlt" (amount), "vs-Berichterstattung" (timestamp)

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