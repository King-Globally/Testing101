import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/articles?page=1&limit=20&cat=fiqh&q=zakat&sort=date&order=desc
 *
 * Public read API for articles with pagination, filtering, and search.
 * No auth required.
 *
 * Query params:
 *   page   — page number (default: 1)
 *   limit  — items per page (default: 20, max: 100)
 *   cat    — filter by category key
 *   q      — search query (title, excerpt, body)
 *   sort   — sort field: id | title | date | createdAt (default: id)
 *   order  — asc | desc (default: desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const cat = searchParams.get("cat") || "";
    const q = searchParams.get("q") || "";
    const sort = searchParams.get("sort") || "id";
    const order = (searchParams.get("order") || "desc") as "asc" | "desc";

    const where: Record<string, unknown> = {};
    if (cat && cat !== "all") where.cat = cat;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { body: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      db.article.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.article.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error("Articles API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch articles" },
      { status: 500 },
    );
  }
}
