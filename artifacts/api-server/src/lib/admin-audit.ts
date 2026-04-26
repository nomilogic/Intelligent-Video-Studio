import { db, adminAuditLogTable } from "@workspace/db";
import type { Request } from "express";
import type { User } from "@workspace/db";

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string | number;
  details?: Record<string, unknown> | string;
}

export async function writeAudit(
  actor: User | null,
  entry: AuditEntry,
  req?: Request,
): Promise<void> {
  await db.insert(adminAuditLogTable).values({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId !== undefined ? String(entry.targetId) : null,
    details:
      typeof entry.details === "string"
        ? entry.details
        : entry.details
          ? JSON.stringify(entry.details)
          : null,
    ipAddress: req?.ip ?? null,
  });
}
