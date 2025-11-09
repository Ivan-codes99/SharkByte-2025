# Logging Solution Documentation

## Overview

A comprehensive logging solution has been implemented throughout the SharkScholar frontend project to aid in debugging and monitoring application behavior.

## Logger Features

### Log Levels

- **debug**: Detailed information for debugging (only in development)
- **info**: General informational messages
- **warn**: Warning messages for potential issues
- **error**: Error messages with stack traces

### Specialized Logging Methods

- **action()**: Log user actions (button clicks, form submissions, etc.)
- **api()**: Log API calls with request/response data
- **route()**: Log route changes
- **performance()**: Log performance metrics with duration

### Log History

- Maintains an in-memory history of the last 100 log entries
- Can be exported as JSON for bug reports
- Can be cleared programmatically

## Usage Examples

### Basic Logging

```typescript
import { logger } from "../lib/logger";

// Debug log (only in development)
logger.debug("Component mounted", { componentName: "MyComponent" }, "MyComponent");

// Info log
logger.info("Operation completed", { result: "success" }, "MyComponent");

// Warning
logger.warn("Deprecated API used", { api: "oldEndpoint" }, "MyComponent");

// Error with exception
try {
  // some operation
} catch (error) {
  logger.error("Operation failed", error, "MyComponent");
}
```

### User Actions

```typescript
logger.action("button_clicked", { buttonId: "submit" }, "MyComponent");
logger.action("form_submitted", { formName: "proposal" }, "ProposalModal");
```

### Performance Metrics

```typescript
const startTime = performance.now();
// ... operation ...
const duration = performance.now() - startTime;
logger.performance("data_processing", duration, { recordCount: 100 });
```

### Route Changes

```typescript
logger.route("/", "/scholarships");
```

## Logged Areas

### Components

- **ConnectWalletButton**: Wallet connection/disconnection events
- **Navbar**: Route changes
- **ProposalModal**: Form submissions, proposal generation, tab switches, copy/download actions
- **ScholarshipCard**: Generate proposal button clicks

### Pages

- **CareerPathway**: Page mount with milestone count
- **Scholarships**: Page mount, filter changes, filter performance, proposal generation clicks

### Libraries

- **wallet.ts**: All wallet operations (connect, disconnect, state management, localStorage operations)
- **ai.ts**: Proposal generation start/completion

### App

- **App.tsx**: Initial app load with route information

## Development vs Production

- **Development**: All log levels are shown (including debug)
- **Production**: Debug logs are automatically filtered out
- Logs are always stored in history regardless of environment

## Accessing Log History

For debugging purposes, you can access the log history in the browser console:

```typescript
import { logger } from "./lib/logger";

// Get all logs
const logs = logger.getHistory();
console.table(logs);

// Export as JSON
const jsonLogs = logger.exportLogs();
console.log(jsonLogs);

// Clear history
logger.clearHistory();
```

## Log Format

Each log entry contains:

```typescript
{
  level: "debug" | "info" | "warn" | "error",
  message: string,
  data?: unknown,
  timestamp: string, // ISO 8601 format
  context?: string    // Component/feature name
}
```

## Best Practices

1. **Use appropriate log levels**: Use debug for detailed info, info for normal flow, warn for potential issues, error for actual errors
2. **Include context**: Always provide a context string to identify where the log originated
3. **Include relevant data**: Pass relevant data objects to help with debugging
4. **Don't log sensitive data**: Avoid logging passwords, tokens, or personal information
5. **Use performance logging**: Track slow operations to identify bottlenecks
6. **Log user actions**: Track important user interactions for analytics and debugging

## Integration Points

The logger is integrated at:

- Component lifecycle events (mount, unmount)
- User interactions (clicks, form submissions)
- Async operations (API calls, wallet connections)
- Route changes
- Error boundaries (error handling)
- Performance-critical operations (filtering, data processing)

## Future Enhancements

Potential improvements:

- Remote logging service integration (e.g., Sentry, LogRocket)
- Log level configuration via environment variables
- Log filtering/searching UI component
- Automatic error reporting
- Performance analytics dashboard

