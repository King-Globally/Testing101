/**
 * Categories utility — derives category lists dynamically from the database
 * instead of the 3 hardcoded arrays that were previously in ArticleGrid,
 * FatwaList, and DownloadsGrid.
 *
 * Usage:
 *   const cats = await getArticleCategories();
 *   // [{ key: "fiqh", label: "Fiqh & Ijtihād", count: 12 }, ...]
 *
 * To add a new category: simply use it in an article/fatwa/download via the
 * admin panel. It will appear automatically.
 */

import { db } from "@/lib/db";

export interface DerivedCategory {
  key: string;
  label: string;
  count: number;
}

// Fallback category labels (used when a new key appears without a known label)
export const CATEGORY_LABELS: Record<string, string> = {
  // Article / Download categories
  fiqh: "Fiqh & Ijtihād",
  salah: "Ṣalāh",
  zakah: "Zakāh",
  qurbani: "Qurbānī",
  akhlaq: "Akhlāq & Character",
  bidah: "Bidʿah & Innovation",
  current: "Current Affairs",
  ramadan: "Ramaḍān",
  hajj: "Ḥajj & ʿUmrah",
  family: "Family & Marriage",
  business: "Business & Trade",
  education: "Education",
  urdu: "Urdu / اردو",
  arabic: "Arabic / العربية",
  // Fatwa categories
  "Zakāh": "Zakāh",
  "Ṣawm (Fasting)": "Ṣawm (Fasting)",
  "Iʿtikāf": "Iʿtikāf",
  "Bidʿah": "Bidʿah",
  "Ḥalāl & Ḥarām": "Ḥalāl & Ḥarām",
  "Ṣalāh": "Ṣalāh",
  "Nikāḥ": "Nikāḥ",
  "Ṭalāq": "Ṭalāq",
  "Mīrāth": "Mīrāth (Inheritance)",
  "Jihād": "Jihād",
  "ʿAqīdah": "ʿAqīdah",
};

function labelFor(key: string): string {
  return CATEGORY_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

/**
 * Get all distinct categories used by articles, with item counts.
 */
export async function getArticleCategories(): Promise<DerivedCategory[]> {
  try {
    const articles = await db.article.findMany({ select: { cat: true, catLabel: true } });
    const map = new Map<string, { label: string; count: number }>();
    for (const a of articles) {
      if (!a.cat) continue;
      const existing = map.get(a.cat);
      if (existing) {
        existing.count++;
      } else {
        map.set(a.cat, { label: a.catLabel || labelFor(a.cat), count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([key, { label, count }]) => ({ key, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/**
 * Get all distinct categories used by fatwas, with item counts.
 */
export async function getFatwaCategories(): Promise<DerivedCategory[]> {
  try {
    const fatwas = await db.fatwa.findMany({ select: { cat: true } });
    const map = new Map<string, number>();
    for (const f of fatwas) {
      if (!f.cat) continue;
      map.set(f.cat, (map.get(f.cat) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, label: key, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/**
 * Get all distinct categories used by downloads, with item counts.
 */
export async function getDownloadCategories(): Promise<DerivedCategory[]> {
  try {
    const downloads = await db.download.findMany({ select: { cat: true, catLabel: true } });
    const map = new Map<string, { label: string; count: number }>();
    for (const d of downloads) {
      if (!d.cat) continue;
      const existing = map.get(d.cat);
      if (existing) {
        existing.count++;
      } else {
        map.set(d.cat, { label: d.catLabel || labelFor(d.cat), count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([key, { label, count }]) => ({ key, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/**
 * Get all distinct categories across all content types.
 * Returns a unified list with the entity type tagged.
 */
export async function getAllCategories(): Promise<Array<DerivedCategory & { entityType: "article" | "fatwa" | "download" }>> {
  const [articles, fatwas, downloads] = await Promise.all([
    getArticleCategories(),
    getFatwaCategories(),
    getDownloadCategories(),
  ]);
  return [
    ...articles.map(c => ({ ...c, entityType: "article" as const })),
    ...fatwas.map(c => ({ ...c, entityType: "fatwa" as const })),
    ...downloads.map(c => ({ ...c, entityType: "download" as const })),
  ];
}

/**
 * Default categories (used as fallback if DB is empty or unavailable).
 * These match the original hardcoded lists for backward compatibility.
 */
export const DEFAULT_ARTICLE_CATEGORIES = [
  { key: "all", label: "All", count: 0 },
  { key: "fiqh", label: "Fiqh & Ijtihād", count: 0 },
  { key: "salah", label: "Ṣalāh", count: 0 },
  { key: "zakah", label: "Zakāh", count: 0 },
  { key: "qurbani", label: "Qurbānī", count: 0 },
  { key: "akhlaq", label: "Akhlāq", count: 0 },
  { key: "bidah", label: "Bidʿah", count: 0 },
  { key: "current", label: "Current Affairs", count: 0 },
];

export const DEFAULT_FATWA_CATEGORIES = [
  { key: "all", label: "All", count: 0 },
  { key: "Zakāh", label: "Zakāh", count: 0 },
  { key: "Ṣawm (Fasting)", label: "Ṣawm (Fasting)", count: 0 },
  { key: "Iʿtikāf", label: "Iʿtikāf", count: 0 },
  { key: "Bidʿah", label: "Bidʿah", count: 0 },
  { key: "Ḥalāl & Ḥarām", label: "Ḥalāl & Ḥarām", count: 0 },
];

export const DEFAULT_DOWNLOAD_CATEGORIES = [
  { key: "all", label: "All", count: 0 },
  { key: "fiqh", label: "Fiqh", count: 0 },
  { key: "salah", label: "Ṣalāh", count: 0 },
  { key: "zakah", label: "Zakāh", count: 0 },
  { key: "urdu", label: "Urdu", count: 0 },
];
