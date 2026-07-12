import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/announcements?limit=20&kind=moon
 *
 * Public read API for announcements with optional filtering by kind.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const kind = searchParams.get("kind") || "";

    const where: Record<string, unknown> = {};
    if (kind && kind !== "all") where.kind = kind;

    const items = await db.announcement.findMany({
      where,
      orderBy: { id: "desc" },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
    });
  } catch (error) {
    console.error("Announcements API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch announcements" },
      { status: 500 },
    );
  }
}
