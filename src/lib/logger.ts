type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";

function format(level: LogLevel, message: string, context?: LogContext) {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context ? { context } : {}),
  };
}

function write(level: LogLevel, message: string, context?: LogContext) {
  const entry = format(level, message, context);

  if (isProduction) {
    // Structured JSON so it can be picked up by a log aggregator
    // (Vercel Logs, Logtail, Datadog, etc.) without extra parsing.
    const line = JSON.stringify(entry);
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  const consoleFn =
    level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  consoleFn(`[${entry.timestamp}] ${level.toUpperCase()}: ${message}`, context ?? "");
}

export const logger = {
  debug: (message: string, context?: LogContext) => {
    if (!isProduction) write("debug", message, context);
  },
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context),
};
