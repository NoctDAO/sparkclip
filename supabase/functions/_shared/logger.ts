/**
 * Structured logging utility for edge functions.
 * Provides consistent, searchable log format for security auditing.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface SecurityLogEntry {
  timestamp: string;
  level: LogLevel;
  function_name: string;
  action: string;
  ip_address: string;
  user_id?: string;
  success: boolean;
  duration_ms?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

/**
 * Creates a structured log entry for security auditing
 */
export function createSecurityLog(
  functionName: string,
  action: string,
  ipAddress: string,
  options: {
    level?: LogLevel;
    userId?: string;
    success?: boolean;
    durationMs?: number;
    metadata?: Record<string, unknown>;
    error?: string;
  } = {}
): SecurityLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: options.level || "info",
    function_name: functionName,
    action,
    ip_address: maskIpAddress(ipAddress),
    user_id: options.userId ? maskUserId(options.userId) : undefined,
    success: options.success ?? true,
    duration_ms: options.durationMs,
    metadata: options.metadata,
    error: options.error,
  };
}

/**
 * Logs a security event with structured JSON format
 */
export function logSecurityEvent(entry: SecurityLogEntry): void {
  const logFn = getLogFunction(entry.level);
  logFn(`[SECURITY_AUDIT] ${JSON.stringify(entry)}`);
}

/**
 * Convenience function to log and return in one call
 */
export function logAndReturn<T>(
  entry: SecurityLogEntry,
  response: T
): T {
  logSecurityEvent(entry);
  return response;
}

/**
 * Masks IP address for privacy (keeps first two octets for IPv4)
 */
function maskIpAddress(ip: string): string {
  if (ip === "unknown") return ip;
  
  // IPv4
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.xxx.xxx`;
    }
  }
  
  // IPv6 - keep first 4 groups
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(":")}:xxxx:xxxx:xxxx:xxxx`;
    }
  }
  
  return "masked";
}

/**
 * Masks user ID for privacy (keeps first 8 chars)
 */
function maskUserId(userId: string): string {
  if (userId.length <= 8) return userId;
  return `${userId.substring(0, 8)}...`;
}

/**
 * Gets the appropriate console function for the log level
 */
function getLogFunction(level: LogLevel): (...args: unknown[]) => void {
  switch (level) {
    case "debug":
      return console.debug;
    case "info":
      return console.info;
    case "warn":
      return console.warn;
    case "error":
      return console.error;
    default:
      return console.log;
  }
}

/**
 * Helper to extract client IP from request headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || "unknown";
}

/**
 * Helper to measure request duration
 */
export function createTimer(): () => number {
  const start = performance.now();
  return () => Math.round(performance.now() - start);
}
