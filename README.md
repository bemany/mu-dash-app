# MU-Dash (Mietwagenunternehmer Dashboard)

A multilingual web application for rental car entrepreneurs to manage Uber trip data, analyze driver performance, and reconcile bonus payments.

![Version](https://img.shields.io/badge/version-2.4.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Multi-Language Support**: German, English, Turkish, Arabic (with RTL support)
- **CSV Import**: Drag & drop upload for Uber trip and payment exports
- **Performance Analytics**: Revenue per hour, km, day, driver, vehicle
- **Shift Analysis**: Automatic day/night shift detection
- **Bonus Reconciliation**: Compare theoretical vs. actual bonus payments
- **Session Management**: Unique 6-character Vorgangs-ID for session retrieval
- **Excel Export**: Export analysis results to Excel
- **Admin Panel**: Manage sessions and view performance logs

## Screenshots

### Performance Dashboard
- KPI tiles with drill-down modals
- Smart date range picker with month presets
- Real-time data visualization

### Import Page
- Drag & drop file upload
- Automatic file type detection
- Progress indicators via WebSocket

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Tailwind CSS v4** for styling
- **shadcn/ui** component library (Radix UI primitives)
- **TanStack React Query** for server state management
- **Wouter** for lightweight routing

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** database
- **Drizzle ORM** with Zod validation
- **WebSocket** for real-time progress updates

## Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14.x or higher
- **npm** or **yarn**

## Environment Variables

Create a `.env` file in the root directory:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/mu_dash

# Optional
SESSION_SECRET=your-secure-session-secret-change-in-production
ADMIN_PASSWORD=your-admin-password
NODE_ENV=development
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/mu-dash.git
cd mu-dash
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up the database

```bash
# Create the database
createdb mu_dash

# Run migrations
npm run db:push
```

### 4. Start development server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

## Database Schema

### Main Tables

| Table | Description |
|-------|-------------|
| `sessions` | User workflow progress, Vorgangs-ID, company name |
| `trips` | Uploaded trip data with license plates and timestamps |
| `transactions` | Payment transaction records |
| `uploads` | Original CSV files stored as base64 |
| `performance_logs` | Import/load performance metrics |
| `user_sessions` | Express session store (PostgreSQL) |

### Migrations

Migrations are managed with Drizzle Kit:

```bash
# Generate migration
npm run db:generate

# Push schema changes
npm run db:push

# View database studio
npm run db:studio
```

## Project Structure

```
mu-dash/
├── client/                 # Frontend React app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── i18n/           # Translations (de, en, tr, ar)
│   │   ├── lib/            # Utilities, mock data, logger
│   │   └── hooks/          # Custom React hooks
│   └── index.html
├── server/                 # Backend Express app
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # Database operations
│   └── progress-broker.ts  # WebSocket handler
├── shared/
│   └── schema.ts           # Drizzle schema + Zod types
├── migrations/             # Database migrations
└── dist/                   # Production build output
```

## API Endpoints

### Session Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/session` | Get current session data |
| POST | `/api/session/load` | Load session by Vorgangs-ID |
| POST | `/api/session/exit` | Exit current session |
| POST | `/api/upload` | Upload CSV files |

### Performance Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/performance/kpis` | Get KPI data with breakdowns |
| GET | `/api/performance/drivers` | Driver performance breakdown |
| GET | `/api/performance/vehicles` | Vehicle performance breakdown |
| GET | `/api/performance/shifts` | Shift analysis |
| GET | `/api/performance/daterange` | Available data date range |
| GET | `/api/performance/commissions` | Commission analysis |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/promo` | Bonus reconciliation report |
| GET | `/api/reports/vehicles` | Vehicle summary report |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/check` | Check admin status |
| GET | `/api/admin/sessions` | List all sessions |
| DELETE | `/api/admin/sessions/:id` | Delete a session |

## CSV File Formats

### Trips CSV (Uber Trip Activity Export)
Required columns:
- `Kennzeichen` - License plate
- `Zeitpunkt der Fahrtbestellung` - Trip order timestamp
- `Fahrtstatus` - Trip status

### Payments CSV (Uber Payments Export)
Required columns:
- `Beschreibung` - Description (license plate extracted via regex)
- `An dein Unternehmen gezahlt` - Amount paid
- `vs-Berichterstattung` - Reporting timestamp
- `Name des Unternehmens` - Company name

## Building for Production

### Build the application

```bash
npm run build
```

This creates:
- `dist/public/` - Frontend static files
- `dist/index.cjs` - Backend bundle

### Start production server

```bash
npm start
```

## Deployment

### Deploy on Replit

1. Import the repository to Replit
2. Set environment variables in Secrets
3. Click "Run" or use the deployment feature

### Deploy on Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "dist/index.cjs"]
```

### Deploy on Railway/Render/Fly.io

1. Connect your GitHub repository
2. Set `DATABASE_URL` environment variable
3. Set build command: `npm run build`
4. Set start command: `npm start`

## Configuration

### Session Configuration

Sessions are stored in PostgreSQL using `connect-pg-simple`:
- Session expiry: 30 days
- Secure cookies in production
- SameSite: lax

### Performance Logging

The app tracks performance metrics for imports and loads:
- Duration in milliseconds
- Record counts (trips, transactions)
- Records per second throughput
- Software version

View metrics in the Admin panel at `/admin`.

## Troubleshooting

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Reset database
npm run db:push --force
```

### Session Issues

If sessions aren't persisting:
1. Check `DATABASE_URL` is correctly set
2. Ensure `user_sessions` table exists
3. Check cookie settings match your domain

### Build Issues

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m 'Add my feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

For issues and feature requests, please use the GitHub Issues page.
