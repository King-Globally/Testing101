import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit, snapshot } from "@/lib/audit";
import { z } from "zod";

const HadithSchema = z.object({
  text: z.string().min(1).max(1000),
  source: z.string().min(1).max(300),
});

export async function GET() {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await db.hadith.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = HadithSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const created = await db.hadith.create({ data: parsed.data });
  await audit({ session, action: "create", entity: "hadith", entityId: created.id, after: snapshot(created), req: req as unknown as Request });
  return NextResponse.json({ item: created });
}

export async function PUT(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = HadithSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const before = await db.hadith.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.hadith.update({ where: { id }, data: parsed.data });
  await audit({ session, action: "update", entity: "hadith", entityId: id, before: snapshot(before), after: snapshot(updated), req: req as unknown as Request });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const before = await db.hadith.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.hadith.delete({ where: { id } });
  await audit({ session, action: "delete", entity: "hadith", entityId: id, before: snapshot(before), req: req as unknown as Request });
  return NextResponse.json({ ok: true });
}
