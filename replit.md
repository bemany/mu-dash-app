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
  - `sessions` - Tracks user workflow progress
  - `trips` - Stores uploaded trip data with license plates and timestamps
  - `transactions` - Stores payment transaction records

### Data Flow
1. Users upload CSV files containing trip or transaction data
2. Data is parsed client-side using PapaParse
3. Parsed data is sent to backend and stored in PostgreSQL
4. Processing logic calculates bonuses based on completed trip counts
5. Results are displayed in a data table comparing expected vs actual payments

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