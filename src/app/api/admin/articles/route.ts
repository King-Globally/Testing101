import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit, snapshot } from "@/lib/audit";
import { detectAndAnnounceChange } from "@/lib/update-detector";
import { z } from "zod";

/**
 * /api/admin/articles
 *   GET    — list all (editor-only)
 *   POST   — create new (editor-only)
 *
 * /api/admin/articles?id=<id>
 *   PUT    — update existing (editor-only)
 *   DELETE — remove (editor-only)
 *
 * All inputs are validated with zod. Every mutation writes an audit log
 * entry capturing the before/after state.
 */

const ArticleSchema = z.object({
  title: z.string().min(1).max(500),
  cat: z.string().min(1).max(50),
  catLabel: z.string().min(1).max(50),
  date: z.string().min(1).max(100),
  excerpt: z.string().min(1).max(1000),
  body: z.string().min(1).max(50000),
});

export async function GET() {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await db.article.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = ArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await db.article.create({ data: parsed.data });

  // Auto-announce new articles to the public
  await detectAndAnnounceChange({
    entityType: "article",
    action: "create",
    entityId: created.id,
    entityTitle: created.title,
  });

  await audit({
    session,
    action: "create",
    entity: "article",
    entityId: created.id,
    after: snapshot(created),
    req: req as unknown as Request,
  });

  return NextResponse.json({ item: created });
}

export async function PUT(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ArticleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const before = await db.article.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.article.update({ where: { id }, data: parsed.data });
  await audit({
    session,
    action: "update",
    entity: "article",
    entityId: id,
    before: snapshot(before),
    after: snapshot(updated),
    req: req as unknown as Request,
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const before = await db.article.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.article.delete({ where: { id } });
  await audit({
    session,
    action: "delete",
    entity: "article",
    entityId: id,
    before: snapshot(before),
    req: req as unknown as Request,
  });

  return NextResponse.json({ ok: true });
}
