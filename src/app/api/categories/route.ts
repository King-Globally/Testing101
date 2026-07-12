import { NextRequest, NextResponse } from "next/server";
import {
  getArticleCategories,
  getFatwaCategories,
  getDownloadCategories,
} from "@/lib/categories";

/**
 * GET /api/categories?type=article|fatwa|download|all
 *
 * Returns dynamic categories derived from the database.
 * Used by the frontend filter chips in ArticleGrid, FatwaList, DownloadsGrid.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    if (type === "article") {
      const cats = await getArticleCategories();
      return NextResponse.json({ success: true, type: "article", categories: cats });
    }
    if (type === "fatwa") {
      const cats = await getFatwaCategories();
      return NextResponse.json({ success: true, type: "fatwa", categories: cats });
    }
    if (type === "download") {
      const cats = await getDownloadCategories();
      return NextResponse.json({ success: true, type: "download", categories: cats });
    }

    // All
    const [articles, fatwas, downloads] = await Promise.all([
      getArticleCategories(),
      getFatwaCategories(),
      getDownloadCategories(),
    ]);
    return NextResponse.json({
      success: true,
      type: "all",
      categories: {
        articles,
        fatwas,
        downloads,
      },
    });
  } catch (error) {
    console.error("Categories API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}
