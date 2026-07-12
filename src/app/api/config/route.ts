import { NextResponse } from "next/server";
import { getFullSiteConfig } from "@/lib/site-config";

/**
 * GET /api/config
 *
 * Returns the full site configuration (org, contact, banking, nav, links,
 * financial indicators). This is a PUBLIC endpoint — no auth required.
 *
 * Used by the frontend to render contact details, banking info, navigation,
 * and useful links from a single source of truth instead of hardcoded values.
 */
export async function GET() {
  try {
    const config = getFullSiteConfig();
    return NextResponse.json({ success: true, ...config });
  } catch (error) {
    console.error("Config API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load config" },
      { status: 500 },
    );
  }
}
