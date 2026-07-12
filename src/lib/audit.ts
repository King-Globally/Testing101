import { db } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Audit-log helper — records every mutation performed by an authenticated
 * editor. Called from the admin CRUD API routes after a successful write.
 */
export async function audit(params: {
  session: Session;
  action: "create" | "update" | "delete";
  entity: string;
  entityId?: string | number;
  before?: unknown;
  after?: unknown;
  req?: Request;
}) {
  const { session, action, entity, entityId, before, after, req } = params;
  const ip = req?.headers?.get("x-forwarded-for")?.split(",")[0].trim() || null;
  const userAgent = req?.headers?.get("user-agent") || null;

  await db.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action,
      entity,
      entityId: entityId != null ? String(entityId) : null,
      before: before != null ? JSON.stringify(before) : null,
      after: after != null ? JSON.stringify(after) : null,
      ip,
      userAgent,
    },
  });
}

/** Best-effort snapshot of a record before mutation (for audit before/after) */
export function snapshot<T>(record: T | null): T | null {
  if (record == null) return null;
  // Return as-is; the audit helper will JSON.stringify it.
  // Prisma returns plain objects, so this is safe.
  return record;
}
