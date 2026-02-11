import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { progressBroker } from "./progress-broker";
import cookie from "cookie";
import cookieParser from "cookie-parser";

const app = express();
const httpServer = createServer(app);

declare module "express-session" {
  interface SessionData {
    uberRetterSessionId?: string;
    isAdmin?: boolean;
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || "uber-retter-secret-key-change-in-production";

// Trust proxy for production (behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Create PostgreSQL pool for session store
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,                        // Sessions need fewer connections
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
});

// Create PostgreSQL session store
const PgSession = connectPgSimple(session);

const sessionMiddleware = session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // Don't save sessions until data is actually imported
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});

const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

wss.on("connection", (ws, req) => {
  // Parse cookies from the request headers
  const cookies = cookie.parse(req.headers.cookie || "");
  const signedSessionId = cookies["connect.sid"];
  
  if (!signedSessionId) {
    ws.close(1008, "No session cookie");
    return;
  }

  // Unsign the session cookie using cookie-parser's signature verification
  const sessionId = cookieParser.signedCookie(signedSessionId, SESSION_SECRET);
  
  if (!sessionId || sessionId === signedSessionId) {
    ws.close(1008, "Invalid session signature");
    return;
  }

  // Use the express session to get the uber-retter session ID
  // The session ID from the cookie needs to be resolved through the session store
  // For simplicity, we'll use the signed session cookie as a secure identifier
  // and store the mapping when the client connects
  
  // Store the WebSocket connection keyed by the secure session cookie ID
  progressBroker.register(sessionId, ws);

  ws.on("close", () => {
    progressBroker.unregister(sessionId, ws);
  });

  ws.on("error", () => {
    progressBroker.unregister(sessionId, ws);
  });
});

app.use(
  express.json({
    limit: '200mb', // Increase limit for very large CSV uploads (300k+ records)
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '200mb' }));
app.use(cookieParser(SESSION_SECRET));
app.use(sessionMiddleware);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
