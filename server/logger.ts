import fs from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ImportPhase = 'upload' | 'parse' | 'validate' | 'insert' | 'complete' | 'error';

interface LogContext {
  sessionId: string;
  vorgangsId?: string | null;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  phase: ImportPhase;
  message: string;
  sessionId: string;
  vorgangsId?: string | null;
  memoryUsageMb: number;
  recordsProcessed?: number;
  durationMs?: number;
  details?: Record<string, unknown>;
}

const LOG_DIR = '/tmp/mu-dash-logs';

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getMemoryUsageMb(): number {
  const used = process.memoryUsage();
  return Math.round(used.heapUsed / 1024 / 1024);
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogLine(level: LogLevel, message: string, context?: LogContext, phase?: ImportPhase, recordsProcessed?: number, durationMs?: number): string {
  const timestamp = formatTimestamp();
  const memMb = getMemoryUsageMb();
  const sessionPart = context?.sessionId ? ` [${context.sessionId.substring(0, 20)}...]` : '';
  const vorgangsPart = context?.vorgangsId ? ` [V:${context.vorgangsId}]` : '';
  const phasePart = phase ? ` [${phase}]` : '';
  const memPart = ` [${memMb}MB]`;
  const recordsPart = recordsProcessed !== undefined ? ` [${recordsProcessed} records]` : '';
  const durationPart = durationMs !== undefined ? ` [${durationMs}ms]` : '';
  
  return `${timestamp} ${level.toUpperCase()}${sessionPart}${vorgangsPart}${phasePart}${memPart}${recordsPart}${durationPart} ${message}`;
}

function writeToFile(line: string) {
  try {
    ensureLogDir();
    const date = new Date().toISOString().split('T')[0];
    const logFile = path.join(LOG_DIR, `import-${date}.log`);
    fs.appendFileSync(logFile, line + '\n');
  } catch (err) {
    console.error('[Logger] Failed to write to file:', err);
  }
}

class ImportLogger {
  private context: LogContext;
  private startTime: number;
  private phaseStartTime: number;
  private logBuffer: LogEntry[] = [];

  constructor(sessionId: string, vorgangsId?: string | null) {
    this.context = { sessionId, vorgangsId };
    this.startTime = Date.now();
    this.phaseStartTime = Date.now();
  }

  setVorgangsId(vorgangsId: string) {
    this.context.vorgangsId = vorgangsId;
  }

  getLogBuffer(): LogEntry[] {
    return this.logBuffer;
  }

  private log(level: LogLevel, message: string, phase: ImportPhase, details?: Record<string, unknown>, recordsProcessed?: number, durationMs?: number) {
    const line = formatLogLine(level, message, this.context, phase, recordsProcessed, durationMs);
    
    console.log(line);
    writeToFile(line);
    
    if (level !== 'debug') {
      this.logBuffer.push({
        timestamp: formatTimestamp(),
        level,
        phase,
        message,
        sessionId: this.context.sessionId,
        vorgangsId: this.context.vorgangsId,
        memoryUsageMb: getMemoryUsageMb(),
        recordsProcessed,
        durationMs,
        details,
      });
    }
  }

  startPhase(phase: ImportPhase) {
    this.phaseStartTime = Date.now();
    this.log('info', `Starting phase: ${phase}`, phase);
  }

  endPhase(phase: ImportPhase, recordsProcessed?: number) {
    const duration = Date.now() - this.phaseStartTime;
    this.log('info', `Completed phase: ${phase}`, phase, undefined, recordsProcessed, duration);
  }

  debug(message: string, phase: ImportPhase, details?: Record<string, unknown>) {
    this.log('debug', message, phase, details);
  }

  info(message: string, phase: ImportPhase, details?: Record<string, unknown>) {
    this.log('info', message, phase, details);
  }

  warn(message: string, phase: ImportPhase, details?: Record<string, unknown>) {
    this.log('warn', message, phase, details);
  }

  error(message: string, phase: ImportPhase, error?: Error | unknown) {
    const errorDetails = error instanceof Error 
      ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
      : { error: String(error) };
    
    this.log('error', message, phase, errorDetails);
  }

  progress(phase: ImportPhase, current: number, total: number, itemType: string) {
    const percent = Math.round((current / total) * 100);
    this.log('debug', `Progress: ${current}/${total} ${itemType} (${percent}%)`, phase, { total, percent, itemType }, current);
  }

  memory(phase: ImportPhase, label: string) {
    const mem = process.memoryUsage();
    const details = {
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
    };
    this.log('info', `Memory [${label}]: heap=${details.heapUsedMb}/${details.heapTotalMb}MB, rss=${details.rssMb}MB`, phase, details);
  }

  complete(tripCount: number, transactionCount: number) {
    const totalDuration = Date.now() - this.startTime;
    const totalRecords = tripCount + transactionCount;
    const recordsPerSecond = totalDuration > 0 ? Math.round((totalRecords / totalDuration) * 1000) : 0;
    
    this.log('info', `Import complete: ${tripCount} trips, ${transactionCount} transactions in ${totalDuration}ms (${recordsPerSecond} rec/s)`, 'complete', { tripCount, transactionCount, recordsPerSecond }, totalRecords, totalDuration);
  }
}

export function createImportLogger(sessionId: string, vorgangsId?: string | null): ImportLogger {
  return new ImportLogger(sessionId, vorgangsId);
}

export function logServerEvent(level: LogLevel, message: string, details?: Record<string, unknown>) {
  const line = formatLogLine(level, message, undefined, 'upload');
  console.log(line);
  writeToFile(line);
}
