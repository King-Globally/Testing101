import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit, snapshot } from "@/lib/audit";
import { z } from "zod";

const AnnouncementSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().min(1).max(5000),
  date: z.string().min(1).max(100),
  kind: z.enum(["urgent", "info", "moon", "ramadan"]),
});

export async function GET() {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await db.announcement.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = AnnouncementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const created = await db.announcement.create({ data: parsed.data });
  await audit({ session, action: "create", entity: "announcement", entityId: created.id, after: snapshot(created), req: req as unknown as Request });
  return NextResponse.json({ item: created });
}

export async function PUT(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = AnnouncementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const before = await db.announcement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.announcement.update({ where: { id }, data: parsed.data });
  await audit({ session, action: "update", entity: "announcement", entityId: id, before: snapshot(before), after: snapshot(updated), req: req as unknown as Request });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const before = await db.announcement.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.announcement.delete({ where: { id } });
  await audit({ session, action: "delete", entity: "announcement", entityId: id, before: snapshot(before), req: req as unknown as Request });
  return NextResponse.json({ ok: true });
}
