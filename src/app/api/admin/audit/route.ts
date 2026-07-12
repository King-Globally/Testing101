import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";

/** GET /api/admin/audit — recent audit log entries (editor-only) */
export async function GET(req: Request) {
  const session = await requireEditor();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
  const entity = url.searchParams.get("entity") || undefined;

  const logs = await db.auditLog.findMany({
    where: entity ? { entity } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json({
    logs: logs.map(l => ({
      id: l.id,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      before: l.before,
      after: l.after,
      ip: l.ip,
      userAgent: l.userAgent,
      createdAt: l.createdAt.toISOString(),
      username: l.user?.username || l.userId,
    })),
  });
}
