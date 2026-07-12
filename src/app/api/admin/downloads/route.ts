import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit, snapshot } from "@/lib/audit";
import { detectAndAnnounceChange } from "@/lib/update-detector";
import { z } from "zod";

const DownloadSchema = z.object({
  title: z.string().min(1).max(300),
  cat: z.string().min(1).max(50),
  catLabel: z.string().min(1).max(50),
  meta: z.string().min(1).max(200),
  desc: z.string().min(1).max(1000),
  filename: z.string().min(1).max(200).regex(/^[\w.-]+\.pdf$/i, "filename must end in .pdf and contain only word/dot/dash chars"),
});

export async function GET() {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await db.download.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = DownloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const created = await db.download.create({ data: parsed.data });
  await detectAndAnnounceChange({ entityType: "download", action: "create", entityId: created.id, entityTitle: created.title });
  await audit({ session, action: "create", entity: "download", entityId: created.id, after: snapshot(created), req: req as unknown as Request });
  return NextResponse.json({ item: created });
}

export async function PUT(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = DownloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const before = await db.download.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.download.update({ where: { id }, data: parsed.data });
  await audit({ session, action: "update", entity: "download", entityId: id, before: snapshot(before), after: snapshot(updated), req: req as unknown as Request });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const before = await db.download.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.download.delete({ where: { id } });
  await audit({ session, action: "delete", entity: "download", entityId: id, before: snapshot(before), req: req as unknown as Request });
  return NextResponse.json({ ok: true });
}
