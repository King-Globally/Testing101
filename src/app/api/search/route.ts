import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { SearchResult, SearchableEntityType } from "@/types/content";

/**
 * GET /api/search?q=<query>&types=article,fatwa,download
 *
 * Server-side search across all content types with diacritic folding.
 * Returns ranked results grouped by type.
 *
 * Query params:
 *   q     — search query (required, min 2 chars)
 *   types — comma-separated list of entity types to search
 *           (article, fatwa, download, announcement, hadith, dyk, link)
 *   limit — max results per type (default: 6)
 */

// Normalize text: lowercase + strip diacritics for fuzzy matching
function normalize(s: string): string {
  return s.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .replace(/[āīūṣḍṭḥḍṛñ]/g, m => ({ ā: "a", ī: "i", ū: "u", ṣ: "s", ḍ: "d", ṭ: "t", ḥ: "h", ṛ: "r", ñ: "n" }[m] || m))
    .trim();
}

function scoreMatch(query: string, text: string): number {
  const nQuery = normalize(query);
  const nText = normalize(text);
  if (!nQuery || !nText) return 0;
  if (nText.includes(nQuery)) {
    // Higher score for matches at the start
    if (nText.startsWith(nQuery)) return 100;
    return 50;
  }
  // Word-level matching
  const queryWords = nQuery.split(/\s+/);
  let wordMatches = 0;
  for (const word of queryWords) {
    if (word.length >= 2 && nText.includes(word)) wordMatches++;
  }
  return (wordMatches / queryWords.length) * 30;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const typesParam = searchParams.get("types") || "article,fatwa,download,announcement,hadith";
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "6")));
    const types = typesParam.split(",").map(t => t.trim()).filter(Boolean) as SearchableEntityType[];

    if (q.length < 2) {
      return NextResponse.json({
        success: true,
        results: [],
        message: "Query too short — minimum 2 characters required.",
      });
    }

    const results: SearchResult[] = [];

    // Search articles
    if (types.includes("article")) {
      try {
        const articles = await db.article.findMany();
        for (const a of articles) {
          const titleScore = scoreMatch(q, a.title) * 2;
          const excerptScore = scoreMatch(q, a.excerpt);
          const bodyScore = scoreMatch(q, a.body) * 0.3;
          const score = Math.max(titleScore, excerptScore, bodyScore);
          if (score > 0) {
            results.push({
              type: "article",
              id: a.id,
              title: a.title,
              excerpt: a.excerpt || a.body.slice(0, 200),
              meta: a.catLabel || a.cat,
              score,
            });
          }
        }
      } catch { /* DB unavailable */ }
    }

    // Search fatwas
    if (types.includes("fatwa")) {
      try {
        const fatwas = await db.fatwa.findMany();
        for (const f of fatwas) {
          const qScore = scoreMatch(q, f.q) * 2;
          const ansScore = scoreMatch(q, f.answer);
          const score = Math.max(qScore, ansScore);
          if (score > 0) {
            results.push({
              type: "fatwa",
              id: f.id,
              title: f.q,
              excerpt: f.answer.slice(0, 200),
              meta: f.cat,
              score,
            });
          }
        }
      } catch { /* DB unavailable */ }
    }

    // Search downloads
    if (types.includes("download")) {
      try {
        const downloads = await db.download.findMany();
        for (const d of downloads) {
          const titleScore = scoreMatch(q, d.title) * 2;
          const descScore = scoreMatch(q, d.desc);
          const score = Math.max(titleScore, descScore);
          if (score > 0) {
            results.push({
              type: "download",
              id: d.id,
              title: d.title,
              excerpt: d.desc,
              meta: d.catLabel || d.cat,
              score,
            });
          }
        }
      } catch { /* DB unavailable */ }
    }

    // Search announcements
    if (types.includes("announcement")) {
      try {
        const announcements = await db.announcement.findMany();
        for (const a of announcements) {
          const titleScore = scoreMatch(q, a.title) * 2;
          const bodyScore = scoreMatch(q, a.body);
          const score = Math.max(titleScore, bodyScore);
          if (score > 0) {
            results.push({
              type: "announcement",
              id: a.id,
              title: a.title,
              excerpt: a.body.slice(0, 200),
              meta: a.date,
              score,
            });
          }
        }
      } catch { /* DB unavailable */ }
    }

    // Search hadiths
    if (types.includes("hadith")) {
      try {
        const hadiths = await db.hadith.findMany();
        for (const h of hadiths) {
          const score = scoreMatch(q, h.text) * 1.5;
          if (score > 0) {
            results.push({
              type: "hadith",
              id: h.id,
              title: h.text.slice(0, 100) + "...",
              excerpt: h.text,
              meta: h.source,
              score,
            });
          }
        }
      } catch { /* DB unavailable */ }
    }

    // Search DYKs
    if (types.includes("dyk")) {
      try {
        const dyks = await db.dyk.findMany();
        for (const d of dyks) {
          const score = scoreMatch(q, d.text);
          if (score > 0) {
            results.push({
              type: "dyk",
              id: d.id,
              title: "Did You Know?",
              excerpt: d.text,
              meta: "",
              score,
            });
          }
        }
      } catch { /* DB unavailable */ }
    }

    // Sort by score descending, then take top N per type
    results.sort((a, b) => b.score - a.score);

    // Group by type and limit per type
    const byType = new Map<SearchableEntityType, SearchResult[]>();
    for (const r of results) {
      const arr = byType.get(r.type) || [];
      if (arr.length < limit) arr.push(r);
      byType.set(r.type, arr);
    }

    const finalResults = Array.from(byType.values()).flat();
    finalResults.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      query: q,
      results: finalResults,
      total: finalResults.length,
      typesSearched: types,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { success: false, error: "Search failed" },
      { status: 500 },
    );
  }
}
