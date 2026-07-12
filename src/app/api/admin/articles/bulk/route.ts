import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";

/**
 * POST /api/admin/articles/bulk
 *
 * Bulk import articles from a JSON array.
 * Body: { items: [{ title, cat, catLabel, date, excerpt, body }, ...] }
 *
 * Used for migrating content from external sources (e.g., scraped articles,
 * imports from other CMS, etc.) without SSH access.
 */
const articleSchema = z.object({
  title: z.string().min(1),
  cat: z.string().min(1),
  catLabel: z.string().optional().default(""),
  date: z.string().optional().default(""),
  excerpt: z.string().optional().default(""),
  body: z.string().min(1),
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
      const parsed = articleSchema.safeParse(item);
      if (!parsed.success) {
        results.errors.push({ row: i, error: parsed.error.message });
        results.skipped++;
        continue;
      }
      try {
        await db.article.create({
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
      entity: "Article (bulk import)",
      entityId: 0,
      after: results,
      req: request as unknown as Request,
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Bulk import articles error:", error);
    return NextResponse.json(
      { success: false, error: "Bulk import failed" },
      { status: 500 },
    );
  }
}
