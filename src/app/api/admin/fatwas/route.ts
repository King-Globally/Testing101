import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit, snapshot } from "@/lib/audit";
import { detectAndAnnounceChange } from "@/lib/update-detector";
import { z } from "zod";

const FatwaSchema = z.object({
  q: z.string().min(1).max(1000),
  cat: z.string().min(1).max(50),
  answer: z.string().min(1).max(20000),
  source: z.string().min(1).max(300),
});

export async function GET() {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await db.fatwa.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = FatwaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const created = await db.fatwa.create({ data: parsed.data });
  await detectAndAnnounceChange({ entityType: "fatwa", action: "create", entityId: created.id, entityQuestion: created.q });
  await audit({ session, action: "create", entity: "fatwa", entityId: created.id, after: snapshot(created), req: req as unknown as Request });
  return NextResponse.json({ item: created });
}

export async function PUT(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const body = await req.json().catch(() => null);
  const parsed = FatwaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  const before = await db.fatwa.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.fatwa.update({ where: { id }, data: parsed.data });
  await audit({ session, action: "update", entity: "fatwa", entityId: id, before: snapshot(before), after: snapshot(updated), req: req as unknown as Request });
  return NextResponse.json({ item: updated });
}

export async function DELETE(req: NextRequest) {
  const session = await requireEditor();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const before = await db.fatwa.findUnique({ where: { id } });
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db.fatwa.delete({ where: { id } });
  await audit({ session, action: "delete", entity: "fatwa", entityId: id, before: snapshot(before), req: req as unknown as Request });
  return NextResponse.json({ ok: true });
}
