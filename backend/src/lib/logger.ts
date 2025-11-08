/**
 * Comprehensive Logging Utility for PathFundAI Backend
 * Provides structured logging with different log levels and context
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger class for backend services
 * Optimized for Cloudflare Workers environment
 */
class Logger {
  private logHistory: LogEntry[] = [];
  private readonly maxHistorySize = 100;
  private readonly isDevelopment: boolean;

  constructor() {
    // In Cloudflare Workers, we can check environment
    // For now, assume development if not explicitly set
    this.isDevelopment = true; // Can be set via env var
  }

  /**
   * Format log entry for console output
   */
  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const errorStr = entry.error
      ? ` Error: ${entry.error.name} - ${entry.error.message}`
      : "";

    return `[${timestamp}] [${level}] ${message}${contextStr}${errorStr}`;
  }

  /**
   * Add log entry to history and output
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: this.isDevelopment ? error.stack : undefined,
          }
        : undefined,
    };

    // Add to history
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Output to console with appropriate method
    const formatted = this.formatLog(entry);
    switch (level) {
      case "debug":
        if (this.isDevelopment) {
          console.debug(formatted);
        }
        break;
      case "info":
        console.log(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "error":
        console.error(formatted);
        if (error && this.isDevelopment) {
          console.error(error.stack);
        }
        break;
    }
  }

  /**
   * Debug level logging - detailed information for debugging
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  /**
   * Info level logging - general informational messages
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  /**
   * Warn level logging - warning messages for potential issues
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  /**
   * Error level logging - error messages with optional error object
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log("error", message, context, error);
  }

  /**
   * Log API request
   */
  api(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    context?: Record<string, unknown>
  ): void {
    const apiContext = {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      ...context,
    };

    if (statusCode >= 500) {
      this.error(`API ${method} ${path} - ${statusCode}`, undefined, apiContext);
    } else if (statusCode >= 400) {
      this.warn(`API ${method} ${path} - ${statusCode}`, apiContext);
    } else {
      this.info(`API ${method} ${path} - ${statusCode}`, apiContext);
    }
  }

  /**
   * Log pathway generation events
   */
  pathway(
    action: "generate" | "cache_hit" | "cache_miss" | "enhance" | "error",
    career: string,
    context?: Record<string, unknown>
  ): void {
    const pathwayContext = {
      action,
      career,
      ...context,
    };

    switch (action) {
      case "generate":
        this.info(`Pathway generation started for: ${career}`, pathwayContext);
        break;
      case "cache_hit":
        this.info(`Pathway cache hit for: ${career}`, pathwayContext);
        break;
      case "cache_miss":
        this.debug(`Pathway cache miss for: ${career}`, pathwayContext);
        break;
      case "enhance":
        this.info(`Pathway AI enhancement for: ${career}`, pathwayContext);
        break;
      case "error":
        this.error(`Pathway generation error for: ${career}`, undefined, pathwayContext);
        break;
    }
  }

  /**
   * Log data aggregation events
   */
  data(
    source: "mdc" | "transfer" | "graduate" | "certifications",
    action: "fetch" | "cache_hit" | "cache_miss" | "error",
    context?: Record<string, unknown>
  ): void {
    const dataContext = {
      source,
      action,
      ...context,
    };

    switch (action) {
      case "fetch":
        this.debug(`Fetching data from ${source}`, dataContext);
        break;
      case "cache_hit":
        this.debug(`Cache hit for ${source} data`, dataContext);
        break;
      case "cache_miss":
        this.debug(`Cache miss for ${source} data`, dataContext);
        break;
      case "error":
        this.error(`Error fetching ${source} data`, undefined, dataContext);
        break;
    }
  }

  /**
   * Log AI/Gemini API events
   */
  ai(
    action: "request" | "response" | "error" | "enhance",
    context?: Record<string, unknown>
  ): void {
    const aiContext = {
      action,
      ...context,
    };

    switch (action) {
      case "request":
        this.debug("Gemini API request", aiContext);
        break;
      case "response":
        this.debug("Gemini API response", aiContext);
        break;
      case "enhance":
        this.info("Pathway enhanced with AI", aiContext);
        break;
      case "error":
        this.error("Gemini API error", undefined, aiContext);
        break;
    }
  }

  /**
   * Log performance metrics
   */
  performance(
    operation: string,
    duration: number,
    details?: Record<string, unknown>
  ): void {
    const perfContext = {
      operation,
      duration: `${duration}ms`,
      ...details,
    };

    if (duration > 1000) {
      this.warn(`Slow operation: ${operation} took ${duration}ms`, perfContext);
    } else {
      this.debug(`Performance: ${operation} took ${duration}ms`, perfContext);
    }
  }

  /**
   * Log storage operations (KV/D1)
   */
  storage(
    operation: "get" | "put" | "delete" | "error",
    key: string,
    context?: Record<string, unknown>
  ): void {
    const storageContext = {
      operation,
      key,
      ...context,
    };

    switch (operation) {
      case "get":
        this.debug(`Storage get: ${key}`, storageContext);
        break;
      case "put":
        this.debug(`Storage put: ${key}`, storageContext);
        break;
      case "delete":
        this.debug(`Storage delete: ${key}`, storageContext);
        break;
      case "error":
        this.error(`Storage error for key: ${key}`, undefined, storageContext);
        break;
    }
  }

  /**
   * Get log history (useful for debugging)
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Clear log history
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Get recent logs as formatted string
   */
  getRecentLogs(count: number = 10): string {
    const recent = this.logHistory.slice(-count);
    return recent.map((entry) => this.formatLog(entry)).join("\n");
  }
}

// Export singleton instance
export const logger = new Logger();

