import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * POST /api/admin/fatwas/bulk
 *
 * Bulk import fatwas from a JSON array.
 * Body: { items: [{ q, cat, answer, source }, ...] }
 */
const fatwaSchema = z.object({
  q: z.string().min(1),
  cat: z.string().min(1),
  answer: z.string().min(1),
  source: z.string().optional().default(""),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireEditor();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: "Expected { items: [...] }" },
        { status: 400 },
      );
    }

    const results = { imported: 0, skipped: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      const parsed = fatwaSchema.safeParse(item);
      if (!parsed.success) {
        results.errors.push({ row: i, error: parsed.error.message });
        results.skipped++;
        continue;
      }
      try {
        await db.fatwa.create({
          data: { ...parsed.data, createdAt: new Date() },
        });
        results.imported++;
      } catch (err) {
        results.errors.push({ row: i, error: String(err) });
        results.skipped++;
      }
    }

    await audit({
      session,
      action: "create",
      entity: "Fatwa (bulk import)",
      entityId: 0,
      after: results,
      req: request as unknown as Request,
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Bulk import fatwas error:", error);
    return NextResponse.json(
      { success: false, error: "Bulk import failed" },
      { status: 500 },
    );
  }
}
