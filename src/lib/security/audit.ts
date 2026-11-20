import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { ClientPlatform } from "@/types";

export interface AuditLogEntry {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  platform?: ClientPlatform;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export function sanitizeMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata) return null;

  const sanitized: Record<string, unknown> = {};
  const sensitiveKeys = ["password", "token", "secret", "hash", "refreshtoken", "accesstoken", "key"];

  for (const [key, value] of Object.entries(metadata)) {
    const isSensitive = sensitiveKeys.some((s) => key.toLowerCase().includes(s));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId || null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId || null,
      platform: entry.platform || "WEB",
      ipAddress: entry.ipAddress || null,
      userAgent: entry.userAgent || null,
      metadata: sanitizeMetadata(entry.metadata),
    });
  } catch (err) {
    console.error("Gagal mencatat audit log:", err);
  }
}
