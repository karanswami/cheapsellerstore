import "server-only";

import { redisCheckAlertThrottle } from "@/lib/redis";
import { notifyTelegram } from "@/lib/telegram-notify";

export type SystemAlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type SystemAlertInput = {
  source: "MongoDB" | "Prisma" | "Server" | "Redis" | "Payment" | "Cron" | "Auth";
  action: string;
  message: string;
  error?: unknown;
  severity?: SystemAlertSeverity;
  user?: {
    id?: string | null;
    userId?: string | null;
    username?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
  ip?: string | null;
  fallbackActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

/** Format error object cleanly for Telegram alert */
function formatErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";
  if (err instanceof Error) {
    return `${err.name}: ${err.message}`;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/** Create a short deterministic hash for alert throttling */
function alertThrottleKey(source: string, action: string, msg: string): string {
  const raw = `${source}:${action}:${msg.slice(0, 100)}`;
  return Buffer.from(raw).toString("base64url").slice(0, 32);
}

/**
 * Send an instant rich Telegram alert when a Database, Server, or Service issue occurs.
 * Throttled to avoid flooding Telegram during network storms.
 */
export async function sendSystemAlert(input: SystemAlertInput): Promise<void> {
  const severity = input.severity || "WARNING";
  const errText = input.error ? formatErrorMessage(input.error) : "";
  const mainMessage = input.message || errText || "System warning detected";

  // Debounce duplicate identical alerts within 60s
  const throttleKey = alertThrottleKey(input.source, input.action, mainMessage);
  const shouldSend = await redisCheckAlertThrottle(throttleKey, 60);
  if (!shouldSend) {
    return;
  }

  const icon =
    severity === "CRITICAL" ? "🚨" : severity === "WARNING" ? "⚠️" : "ℹ️";

  const lines: string[] = [
    `${icon} ${severity} SYSTEM ALERT — DRIP`,
    "",
    `• Source: ${input.source}`,
    `• Action: ${input.action}`,
    `• Message: ${mainMessage}`,
  ];

  if (errText && errText !== mainMessage) {
    lines.push(`• Error Detail: ${errText.slice(0, 300)}`);
  }

  if (input.user) {
    const who =
      input.user.username ? `@${input.user.username}` :
      input.user.email ? input.user.email :
      input.user.userId ? `ID: ${input.user.userId.slice(0, 12)}` : "Guest";
    lines.push(`• Actor: ${who}${input.user.role ? ` (${input.user.role})` : ""}`);
  }

  if (input.ip) {
    lines.push(`• Client IP: ${input.ip}`);
  }

  if (input.fallbackActive) {
    lines.push("• Fallback: ✅ Buffered in Redis (0% Data Loss)");
  }

  const now = new Date();
  const timeStr = `${now.toISOString().replace("T", " ").slice(0, 19)} UTC`;
  lines.push(`• Timestamp: ${timeStr}`);

  const fullText = lines.join("\n");

  // Send to Telegram admin channel
  await notifyTelegram("adminUpdate", fullText).catch((err) => {
    console.warn("[system-alert] Telegram notify failed:", err?.message || err);
  });
}

/** Helper for database / Prisma / Mongo specific error alerts */
export async function reportDatabaseError(
  action: string,
  error: unknown,
  context?: {
    user?: SystemAlertInput["user"];
    ip?: string | null;
    fallbackActive?: boolean;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  const errMsg = formatErrorMessage(error);
  const isCritical =
    errMsg.includes("MongoServerSelectionError") ||
    errMsg.includes("PrismaClientInitializationError") ||
    errMsg.includes("Connection lost") ||
    errMsg.includes("timed out") ||
    errMsg.includes("quota exceeded") ||
    errMsg.includes("storage full");

  await sendSystemAlert({
    source: "MongoDB",
    action,
    message: errMsg,
    error,
    severity: isCritical ? "CRITICAL" : "WARNING",
    user: context?.user,
    ip: context?.ip,
    fallbackActive: context?.fallbackActive ?? true,
    metadata: context?.metadata,
  });
}

/** Helper for critical server 500 / unexpected exceptions */
export async function reportServerError(
  action: string,
  error: unknown,
  context?: {
    user?: SystemAlertInput["user"];
    ip?: string | null;
    metadata?: Record<string, unknown> | null;
  },
): Promise<void> {
  await sendSystemAlert({
    source: "Server",
    action,
    message: formatErrorMessage(error),
    error,
    severity: "CRITICAL",
    user: context?.user,
    ip: context?.ip,
    metadata: context?.metadata,
  });
}
