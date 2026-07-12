import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireEditor } from "@/lib/auth";

/**
 * GET /api/admin/exports?entity=articles|fatwas|downloads|all
 *
 * Exports all content of the specified entity type as JSON for backup.
 * Requires editor auth.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireEditor();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entity = searchParams.get("entity") || "all";
    const timestamp = new Date().toISOString().split("T")[0];

    const exportData: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      exportedBy: (session as { user?: { email?: string } })?.user?.email || "unknown",
      version: 1,
    };

    if (entity === "articles" || entity === "all") {
      exportData.articles = await db.article.findMany({ orderBy: { id: "asc" } });
    }
    if (entity === "fatwas" || entity === "all") {
      exportData.fatwas = await db.fatwa.findMany({ orderBy: { id: "asc" } });
    }
    if (entity === "downloads" || entity === "all") {
      exportData.downloads = await db.download.findMany({ orderBy: { id: "asc" } });
    }
    if (entity === "announcements" || entity === "all") {
      exportData.announcements = await db.announcement.findMany({ orderBy: { id: "asc" } });
    }
    if (entity === "hadiths" || entity === "all") {
      exportData.hadiths = await db.hadith.findMany({ orderBy: { id: "asc" } });
    }
    if (entity === "dyks" || entity === "all") {
      exportData.dyks = await db.dyk.findMany({ orderBy: { id: "asc" } });
    }
    if (entity === "prayer" || entity === "all") {
      exportData.prayer = await db.prayerSchedule.findMany({ orderBy: { order: "asc" } });
    }

    const filename = `jamiat-export-${entity}-${timestamp}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json(
      { success: false, error: "Export failed" },
      { status: 500 },
    );
  }
}
