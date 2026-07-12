import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/downloads?page=1&limit=20&cat=fiqh&q=ramadan
 *
 * Public read API for downloads with pagination, filtering, and search.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const cat = searchParams.get("cat") || "";
    const q = searchParams.get("q") || "";

    const where: Record<string, unknown> = {};
    if (cat && cat !== "all") where.cat = cat;
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { desc: { contains: q } },
      ];
    }

    const [items, total] = await Promise.all([
      db.download.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.download.count({ where }),
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
    console.error("Downloads API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch downloads" },
      { status: 500 },
    );
  }
}
