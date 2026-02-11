const APP_VERSION = "3.1.0";
const BUILD_NUMBER = "260211-1";

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  data?: any;
  level?: LogLevel;
}

function formatTimestamp(): string {
  return new Date().toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3 
  });
}

function log(category: string, message: string, options?: LogOptions) {
  const { data, level = 'info' } = options || {};
  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${category}]`;
  
  const logFn = level === 'error' ? console.error 
    : level === 'warn' ? console.warn 
    : level === 'debug' ? console.debug 
    : console.log;

  if (data !== undefined) {
    logFn(`${prefix} ${message}`, data);
  } else {
    logFn(`${prefix} ${message}`);
  }
}

export const logger = {
  app: (message: string, options?: LogOptions) => log('App', message, options),
  nav: (message: string, options?: LogOptions) => log('Navigation', message, options),
  import: (message: string, options?: LogOptions) => log('Import', message, options),
  session: (message: string, options?: LogOptions) => log('Session', message, options),
  ui: (message: string, options?: LogOptions) => log('UI', message, options),
  api: (message: string, options?: LogOptions) => log('API', message, options),
  warn: (message: string, data?: any) => log('Warning', message, { data, level: 'warn' }),
  error: (message: string, error?: any) => log('Error', message, { data: error, level: 'error' }),
  
  init: () => {
    console.log(`%c[MU-Dash] Version ${APP_VERSION} (Build ${BUILD_NUMBER})`, 'color: #10b981; font-weight: bold');
    console.log(`%c[MU-Dash] Logging initialized at ${formatTimestamp()}`, 'color: #6b7280');
  }
};
