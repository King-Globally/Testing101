/**
 * AnnouncementManager — intelligent filtering of announcements and headlines
 * based on the current Hijri date and moon-sighting state.
 *
 * Intelligence rules:
 *  1. When the current month enters its last week (day ≥ 24):
 *     - General announcements and ahadith about THAT month are removed/suppressed
 *       (they have served their purpose; continuing them is annoying).
 *     - Moon-sighting announcement for the UPCOMING month is shown instead.
 *  2. When a new month has just begun (day ≤ 3):
 *     - Show ushering ahadith + a brief "welcome to the new month" notice.
 *     - Suppress any "month ending" announcements from the previous month.
 *  3. NEVER show a moon-sighting announcement for the CURRENT month when it
 *     is ending — that would be paradoxical. Only announce the UPCOMING month.
 *  4. Ramaḍān-specific announcements should not appear outside Ramaḍān.
 *  5. Eid announcements should disappear after the third of Shawwāl.
 *  6. Ḥajj/'Arafah announcements should disappear after the 13th of Dhul-Ḥijjah.
 *
 * This produces a "headline slide deck" that is always contextually appropriate.
 */

import { isInLastWeek, isNearMonthEnd, getMonthTheme, MONTH_THEMES } from "./moon-sighting";
import { getRotatingHadith, getMonthTransitionHadith, getMonthUsherHadith, type ThemedHadith } from "./hadith-rotation";

export interface AnnouncementItem {
  id: number;
  title: string;
  body: string;
  date: string;
  kind: string; // "urgent" | "info" | "ramadan" | "moon" | "eid" | "hajj"
}

export interface HeadlineSlide {
  id: string;
  type: "hadith" | "announcement" | "moon-sighting" | "month-usher";
  text: string;
  source?: string;
  title?: string;
  date?: string;
  kind?: string;
  priority: number; // higher = more prominent
  meta?: Record<string, unknown>;
}

export interface FilterResult {
  activeAnnouncements: AnnouncementItem[];
  expiredAnnouncements: AnnouncementItem[];
  headlineSlides: HeadlineSlide[];
  rotatingHadith: ThemedHadith;
  transitionHadith: ThemedHadith | null;
  usherHadith: ThemedHadith | null;
  mode: "normal" | "month-ending" | "month-beginning" | "early-month";
  reason: string;
}

/**
 * Determine whether an announcement is "month-specific" (tied to a particular
 * Hijri month) and should be removed when that month enters its last week.
 */
function getMonthSpecificKind(announcement: AnnouncementItem): number | null {
  // Returns the Hijri month (1-12) this announcement is tied to, or null
  const title = announcement.title.toLowerCase();
  const body = announcement.body.toLowerCase();
  const text = `${title} ${body}`;

  if (text.includes("ramaḍān") || text.includes("ramadan") || text.includes("fasting month")) return 9;
  if (text.includes("shawwāl") || text.includes("shawwal") || text.includes("eid al-fiṭr") || text.includes("eid al-fitr") || text.includes("eid mubārak")) return 10;
  if (text.includes("dhul-ḥijjah") || text.includes("dhul-hijjah") || text.includes("ḥajj") || text.includes("hajj") || text.includes("arafah") || text.includes("'arafah") || text.includes("eid al-aḍḥā") || text.includes("eid al-adha")) return 12;
  if (text.includes("muḥarram") || text.includes("muharram") || text.includes("āshūrā") || text.includes("ashura")) return 1;
  if (text.includes("rajab") || text.includes("rajib")) return 7;
  if (text.includes("sha'bān") || text.includes("sha'ban") || text.includes("shaban") || text.includes("shabaan")) return 8;
  if (text.includes("rabī' al-awwal") || text.includes("rabi al-awwal") || text.includes("rabi-ul-awwal") || text.includes("mawlid") || text.includes("mawlud")) return 3;
  if (text.includes("dhul-qa'dah") || text.includes("dhul-qadah")) return 11;
  if (text.includes("jumādā") || text.includes("jumada")) {
    if (text.includes("ūlā") || text.includes("ula") || text.includes("awwal")) return 5;
    return 6;
  }
  if (text.includes("ṣafar") || text.includes("safar")) return 2;
  if (text.includes("rabī' al-ākhir") || text.includes("rabi al-akhir") || text.includes("rabi-us-sani")) return 4;
  return null;
}

/**
 * Determine if an announcement should be suppressed right now.
 */
function shouldSuppressAnnouncement(
  announcement: AnnouncementItem,
  currentHijriMonth: number,
  currentHijriDay: number,
): { suppress: boolean; reason: string } {
  const monthKind = getMonthSpecificKind(announcement);

  // Moon-sighting announcement about the CURRENT month — suppress if month is ending
  // (it would be paradoxical to announce sighting the moon of a month already in progress)
  if (announcement.kind === "moon" && monthKind === currentHijriMonth && currentHijriDay > 5) {
    return {
      suppress: true,
      reason: `Moon-sighting announcement for the current month (${currentHijriMonth}) is suppressed — month is already in progress (day ${currentHijriDay}).`,
    };
  }

  // Month-specific announcement: suppress in the last week of that month
  if (monthKind === currentHijriMonth && currentHijriDay >= 24) {
    return {
      suppress: true,
      reason: `Month-specific announcement for month ${currentHijriMonth} is suppressed in the last week (day ${currentHijriDay}). It will not appear again until next year, in shā' Allāh.`,
    };
  }

  // Month-specific announcement for a DIFFERENT month — only show if relevant
  // (e.g. an upcoming Eid announcement for Shawwāl can be shown in late Ramaḍān)
  if (monthKind !== null && monthKind !== currentHijriMonth) {
    // Show only if the referenced month is the NEXT month and we're in the last week
    const isNextMonth = (monthKind === (currentHijriMonth % 12) + 1);
    if (isNextMonth && currentHijriDay >= 24) {
      return { suppress: false, reason: "" }; // Allow: relevant preview
    }
    // Otherwise suppress if it's for a month far away
    if (!isNextMonth) {
      return {
        suppress: true,
        reason: `Announcement references month ${monthKind} but we are in month ${currentHijriMonth}.`,
      };
    }
  }

  return { suppress: false, reason: "" };
}

/**
 * Build the headline slide deck — what should be shown in the rotating banner.
 *
 * The slide deck adapts intelligently:
 *  - Early month (days 1-7): ushering hadith + general announcements + 1 rotating hadith
 *  - Mid month (days 8-23): rotating hadith + general announcements (no month-specific)
 *  - Last week (days 24-30): moon-sighting alert + month-transition hadith + relevant upcoming-month announcements
 */
function buildHeadlineSlides(
  activeAnnouncements: AnnouncementItem[],
  rotatingHadith: ThemedHadith,
  transitionHadith: ThemedHadith | null,
  usherHadith: ThemedHadith | null,
  moonSightingTitle: string | null,
  currentHijriMonth: number,
  currentHijriDay: number,
  nextHijriMonth: number,
): HeadlineSlide[] {
  const slides: HeadlineSlide[] = [];
  const isLastWeek = currentHijriDay >= 24;
  const isEarlyMonth = currentHijriDay <= 7;

  // Priority 1: Moon-sighting alert (only in last week)
  if (isLastWeek && moonSightingTitle) {
    slides.push({
      id: `moon-${Date.now()}`,
      type: "moon-sighting",
      text: moonSightingTitle,
      kind: "moon",
      priority: 100,
      title: moonSightingTitle,
      meta: { nextHijriMonth, currentHijriDay },
    });
  }

  // Priority 2: Month-transition hadith (last week — ushering the new month)
  if (isLastWeek && transitionHadith) {
    slides.push({
      id: `transition-${Date.now()}`,
      type: "hadith",
      text: transitionHadith.text,
      source: transitionHadith.source,
      kind: "transition",
      priority: 90,
      meta: { theme: transitionHadith.theme, for: nextHijriMonth },
    });
  }

  // Priority 3: Month-usher hadith (early month — welcoming the new month)
  if (isEarlyMonth && usherHadith) {
    slides.push({
      id: `usher-${Date.now()}`,
      type: "month-usher",
      text: usherHadith.text,
      source: usherHadith.source,
      kind: "usher",
      priority: 85,
      meta: { for: currentHijriMonth },
    });
  }

  // Priority 4: Active announcements
  for (const ann of activeAnnouncements.slice(0, 3)) {
    slides.push({
      id: `ann-${ann.id}`,
      type: "announcement",
      text: ann.title,
      title: ann.title,
      date: ann.date,
      kind: ann.kind,
      priority: 70,
    });
  }

  // Priority 5: Rotating hadith (always present as a steady background)
  if (!isLastWeek || !transitionHadith) {
    slides.push({
      id: `hadith-rot-${Date.now()}`,
      type: "hadith",
      text: rotatingHadith.text,
      source: rotatingHadith.source,
      kind: "rotating",
      priority: 50,
    });
  }

  // Sort by priority (highest first)
  return slides.sort((a, b) => b.priority - a.priority);
}

/**
 * MAIN EXPORT — filter announcements and build intelligent headline slides.
 */
export function filterAnnouncementsIntelligently(
  announcements: AnnouncementItem[],
  currentHijriYear: number,
  currentHijriMonth: number,
  currentHijriDay: number,
  moonSightingTitle: string | null,
  moonSightingSuppressed: boolean,
): FilterResult {
  const activeAnnouncements: AnnouncementItem[] = [];
  const expiredAnnouncements: AnnouncementItem[] = [];

  for (const ann of announcements) {
    const { suppress, reason } = shouldSuppressAnnouncement(ann, currentHijriMonth, currentHijriDay);
    if (suppress) {
      expiredAnnouncements.push({ ...ann, body: `${ann.body}\n\n[Suppressed: ${reason}]` });
    } else {
      activeAnnouncements.push(ann);
    }
  }

  // Determine mode
  let mode: FilterResult["mode"] = "normal";
  let reason = "Standard announcement rotation";
  if (currentHijriDay >= 24) {
    mode = "month-ending";
    reason = `Last week of month ${currentHijriMonth} (day ${currentHijriDay}) — month-specific announcements suppressed, moon-sighting alert active.`;
  } else if (currentHijriDay <= 3) {
    mode = "month-beginning";
    reason = `First days of month ${currentHijriMonth} (day ${currentHijriDay}) — ushering hadith shown, previous month's announcements cleared.`;
  } else if (currentHijriDay <= 7) {
    mode = "early-month";
    reason = `Early month ${currentHijriMonth} — ushering hadith may appear, standard announcements active.`;
  }

  // Get hadith
  const rotatingHadith = getRotatingHadith(currentHijriMonth, currentHijriYear);
  const nextHijriMonth = currentHijriMonth === 12 ? 1 : currentHijriMonth + 1;
  const transitionHadith = currentHijriDay >= 24 ? getMonthTransitionHadith(nextHijriMonth) : null;
  const usherHadith = currentHijriDay <= 7 ? getMonthUsherHadith(currentHijriMonth) : null;

  // Build headline slides — only include moon-sighting title if not suppressed
  const moonTitle = (currentHijriDay >= 24 && !moonSightingSuppressed) ? moonSightingTitle : null;
  const headlineSlides = buildHeadlineSlides(
    activeAnnouncements,
    rotatingHadith,
    transitionHadith,
    usherHadith,
    moonTitle,
    currentHijriMonth,
    currentHijriDay,
    nextHijriMonth,
  );

  return {
    activeAnnouncements,
    expiredAnnouncements,
    headlineSlides,
    rotatingHadith,
    transitionHadith,
    usherHadith,
    mode,
    reason,
  };
}

/**
 * Convenience — returns just the headline slides for the banner.
 */
export function getActiveHeadlineSlides(
  announcements: AnnouncementItem[],
  currentHijriYear: number,
  currentHijriMonth: number,
  currentHijriDay: number,
  moonSightingTitle: string | null,
  moonSightingSuppressed: boolean,
): HeadlineSlide[] {
  return filterAnnouncementsIntelligently(
    announcements, currentHijriYear, currentHijriMonth, currentHijriDay,
    moonSightingTitle, moonSightingSuppressed,
  ).headlineSlides;
}

export { isInLastWeek, isNearMonthEnd, getMonthTheme, MONTH_THEMES };
