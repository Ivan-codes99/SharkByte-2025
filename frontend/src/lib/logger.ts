type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown, context?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    const entry = this.formatMessage(level, message, data, context);
    this.addToHistory(entry);

    if (!this.isDevelopment && level === "debug") {
      return; // Skip debug logs in production
    }

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ""}`;
    const logMessage = `${prefix} ${message}`;

    switch (level) {
      case "debug":
        console.debug(logMessage, data || "");
        break;
      case "info":
        console.info(logMessage, data || "");
        break;
      case "warn":
        console.warn(logMessage, data || "");
        break;
      case "error":
        console.error(logMessage, data || "");
        break;
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.log("debug", message, data, context);
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log("info", message, data, context);
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log("warn", message, data, context);
  }

  error(message: string, error?: unknown, context?: string): void {
    const errorData = error instanceof Error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : error;
    this.log("error", message, errorData, context);
  }

  // Get log history (useful for debugging)
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // Clear log history
  clearHistory(): void {
    this.logHistory = [];
  }

  // Export logs as JSON (useful for bug reports)
  exportLogs(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }

  // Log user action
  action(action: string, details?: unknown, context?: string): void {
    this.info(`User action: ${action}`, details, context || "USER_ACTION");
  }

  // Log API call
  api(method: string, endpoint: string, data?: unknown, response?: unknown): void {
    this.debug(`API ${method} ${endpoint}`, { request: data, response }, "API");
  }

  // Log route change
  route(from: string, to: string): void {
    this.info(`Route change: ${from} → ${to}`, undefined, "ROUTER");
  }

  // Log performance metric
  performance(metric: string, duration: number, details?: Record<string, unknown>): void {
    this.debug(`Performance: ${metric}`, { duration: `${duration}ms`, ...(details || {}) }, "PERFORMANCE");
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in components
export type { LogLevel, LogEntry };

