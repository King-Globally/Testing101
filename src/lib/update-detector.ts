/**
 * UpdateAnnouncementDetector — intelligent system that detects when admin or
 * developer makes changes and automatically creates public announcements for
 * changes that are relevant to the public.
 *
 * How it works:
 * 1. After every admin CRUD operation (create/update/delete), the system checks
 *    if the change is "public-worthy" using intelligent rules
 * 2. If yes, it creates an announcement with kind "info" that appears in the
 *    headline banner and announcements page
 * 3. Internal changes (admin password, audit logs, prayer times) are NOT announced
 *
 * Public-worthy changes:
 * - New article published → "New article: [title]"
 * - New fatwa added → "New fatwa: [question preview]"
 * - New download available → "New download: [title]"
 * - Article updated (significant) → "Article updated: [title]"
 * - Announcement created by admin → already public (no auto-announce)
 *
 * NOT public-worthy (silent):
 * - Admin login/logout
 * - Password changes
 * - Prayer time edits
 * - Hadith/DYK edits (these rotate automatically)
 * - Deletes (silent — no need to announce removals)
 */

import { db } from "@/lib/db";

type EntityType = "article" | "fatwa" | "download" | "announcement";
type Action = "create" | "update";

interface ChangeContext {
  entityType: EntityType;
  action: Action;
  entityId: number;
  entityTitle?: string;
  entityQuestion?: string;
}

/**
 * Determine if a change is public-worthy and create an announcement if so.
 * This is called after every successful admin CRUD operation.
 */
export async function detectAndAnnounceChange(ctx: ChangeContext): Promise<void> {
  // Only announce CREATEs and significant UPDATEs — never DELETEs
  if (ctx.action !== "create" && ctx.action !== "update") return;

  let title = "";
  let body = "";
  let kind = "info";

  switch (ctx.entityType) {
    case "article":
      if (ctx.action === "create") {
        title = `New Article: ${ctx.entityTitle || "Untitled"}`;
        body = `A new article has been published: "${ctx.entityTitle}". Read it in the Articles section.`;
      } else {
        // Only announce updates if the article body changed significantly
        // For now, we skip update announcements for articles to avoid noise
        return;
      }
      break;

    case "fatwa":
      if (ctx.action === "create") {
        const preview = (ctx.entityQuestion || "").substring(0, 80);
        title = `New Fatwa Q&A Added`;
        body = `A new fatwa has been added: "${preview}${preview.length >= 80 ? "..." : ""}". See the Fatwa Q&A section.`;
      } else {
        return; // Skip fatwa updates
      }
      break;

    case "download":
      if (ctx.action === "create") {
        title = `New Download Available: ${ctx.entityTitle || "Resource"}`;
        body = `A new resource has been added to the download library: "${ctx.entityTitle}". Available in the Downloads section.`;
      } else {
        return; // Skip download updates
      }
      break;

    case "announcement":
      return; // Announcements are already public — no meta-announcement needed

    default:
      return;
  }

  // Create the auto-announcement
  try {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-ZA", {
      day: "numeric", month: "long", year: "numeric",
    });

    await db.announcement.create({
      data: {
        title,
        body,
        date: dateStr,
        kind,
      },
    });

    console.log(`[Auto-Announce] Created: ${title}`);
  } catch (error) {
    console.error("[Auto-Announce] Failed:", error);
  }
}
