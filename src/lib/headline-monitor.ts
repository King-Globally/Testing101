/**
 * IntelligentHeadlineMonitor — live system that generates context-aware
 * headlines synced with current events, Hijri calendar, and moon-sighting state.
 *
 * This system runs on the server (via /api/moon-sighting) and determines
 * what headlines should appear in the banner based on:
 *
 * 1. Current Hijri date (which Islamic month, which day)
 * 2. Moon-sighting state (is a new month approaching?)
 * 3. Current announcements in the database
 * 4. Special days (Āshūrā, Laylat al-Qadr, Eid, etc.)
 * 5. Rotating hadith (3-month cycle)
 * 6. Time of day (morning/evening greetings)
 *
 * The headlines are priority-ranked and the top ones are shown in the
 * rotating banner.
 */

import { getCurrentIslamicDate, HIJRI_MONTHS_LATIN } from "./hijri";
import { getMonthTheme, isNearMonthEnd, isInLastWeek } from "./moon/moon-sighting";
import { getRotatingHadith, getMonthTransitionHadith } from "./moon/hadith-rotation";

export interface HeadlineItem {
  id: string;
  type: "moon-sighting" | "hadith" | "announcement" | "special-day" | "greeting";
  text: string;
  title?: string;
  date?: string;
  source?: string;
  kind?: string;
  priority: number;
  meta?: Record<string, unknown>;
}

/**
 * Generate intelligent headlines based on the current date and context.
 * Returns a priority-ranked list of headline items.
 */
export function generateIntelligentHeadlines(
  announcements: Array<{ id: number; title: string; body: string; date: string; kind: string }>,
  hadiths: Array<{ id: number; text: string; source: string }>,
  hadithIdx: number = 0,
): HeadlineItem[] {
  const headlines: HeadlineItem[] = [];
  const now = new Date();
  const hijri = getCurrentIslamicDate(now);
  const theme = getMonthTheme(hijri.month);
  const nearMonthEnd = isNearMonthEnd(hijri.day);
  const inLastWeek = isInLastWeek(hijri.day);

  // ─── 1. Moon-sighting alert (highest priority, only in last week) ───
  if (inLastWeek) {
    const nextMonth = hijri.month === 12 ? 1 : hijri.month + 1;
    const nextMonthName = HIJRI_MONTHS_LATIN[nextMonth - 1];
    headlines.push({
      id: `moon-${Date.now()}`,
      type: "moon-sighting",
      text: `Hilaal Committee — Sighting of ${nextMonthName} ${hijri.year} AH`,
      kind: "moon",
      priority: 100,
      meta: { nextMonth, currentDay: hijri.day },
    });
  }

  // ─── 2. Month-transition hadith (last week — ushering the new month) ───
  if (inLastWeek) {
    const nextMonth = hijri.month === 12 ? 1 : hijri.month + 1;
    const transition = getMonthTransitionHadith(nextMonth);
    headlines.push({
      id: `transition-${Date.now()}`,
      type: "hadith",
      text: transition.text,
      source: transition.source,
      kind: "transition",
      priority: 90,
    });
  }

  // ─── 3. Special day alerts (based on Hijri day) ───
  // Āshūrā (9, 10, 11 Muḥarram)
  if (hijri.month === 1 && [9, 10, 11].includes(hijri.day)) {
    headlines.push({
      id: `special-ashura-${hijri.day}`,
      type: "special-day",
      text: `Āshūrā fast — ${hijri.day} Muḥarram ${hijri.year} AH. The Prophet ﷺ fasted this day to expiate the sins of the past year.`,
      kind: "ramadan",
      priority: 95,
    });
  }

  // Laylat al-Qadr (last 10 odd nights of Ramaḍān)
  if (hijri.month === 9 && hijri.day >= 21 && hijri.day <= 29 && hijri.day % 2 === 1) {
    headlines.push({
      id: `special-qadr-${hijri.day}`,
      type: "special-day",
      text: `Seek Laylat al-Qadr tonight — ${hijri.day} Ramaḍān. Better than a thousand months.`,
      kind: "ramadan",
      priority: 95,
    });
  }

  // Day of 'Arafah (9 Dhul-Ḥijjah)
  if (hijri.month === 12 && hijri.day === 9) {
    headlines.push({
      id: `special-arafah`,
      type: "special-day",
      text: `Day of 'Arafah — fast today (for non-pilgrims) to expiate the sins of the past and coming year.`,
      kind: "ramadan",
      priority: 95,
    });
  }

  // Eid al-Fiṭr (1 Shawwāl)
  if (hijri.month === 10 && hijri.day === 1) {
    headlines.push({
      id: `special-eid-fitr`,
      type: "special-day",
      text: `Eid Mubārak — Eid al-Fiṭr, 1 Shawwāl ${hijri.year} AH.`,
      kind: "ramadan",
      priority: 99,
    });
  }

  // Eid al-Aḍḥā (10 Dhul-Ḥijjah)
  if (hijri.month === 12 && hijri.day === 10) {
    headlines.push({
      id: `special-eid-adha`,
      type: "special-day",
      text: `Eid Mubārak — Eid al-Aḍḥā, 10 Dhul-Ḥijjah ${hijri.year} AH.`,
      kind: "ramadan",
      priority: 99,
    });
  }

  // Islamic New Year (1 Muḥarram)
  if (hijri.month === 1 && hijri.day === 1) {
    headlines.push({
      id: `special-new-year`,
      type: "special-day",
      text: `Islamic New Year — 1 Muḥarram ${hijri.year} AH. May Allah bless this new year for the Ummah.`,
      kind: "info",
      priority: 95,
    });
  }

  // ─── 4. Active announcements from database ───
  for (const ann of announcements.slice(0, 3)) {
    headlines.push({
      id: `ann-${ann.id}`,
      type: "announcement",
      text: ann.title,
      title: ann.title,
      date: ann.date,
      kind: ann.kind,
      priority: 70,
    });
  }

  // ─── 5. Rotating hadith (always present as steady background) ───
  if (!inLastWeek) {
    const rotating = getRotatingHadith(hijri.month, hijri.year);
    headlines.push({
      id: `hadith-rot-${Date.now()}`,
      type: "hadith",
      text: rotating.text,
      source: rotating.source,
      kind: "rotating",
      priority: 50,
    });
  }

  // Also add a second hadith from the database pool
  if (hadiths.length > 0) {
    const h = hadiths[hadithIdx % hadiths.length];
    headlines.push({
      id: `hadith-db-${h.id}`,
      type: "hadith",
      text: h.text,
      source: h.source,
      kind: "rotating",
      priority: 40,
    });
  }

  // Sort by priority (highest first)
  return headlines.sort((a, b) => b.priority - a.priority);
}
