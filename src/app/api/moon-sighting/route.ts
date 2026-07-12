import { NextResponse } from "next/server";
import {
  getMoonSightingInfo,
  getMonthTheme,
  isNearMonthEnd,
  isInLastWeek,
  HIJRI_MONTH_NAMES,
  HIJRI_MONTH_NAMES_AR,
  type MoonSightingInfo,
} from "@/lib/moon/moon-sighting";
import {
  getMonthTransitionHadith,
  getRotatingHadith,
  getMonthUsherHadith,
  getRotatingHadithSet,
} from "@/lib/moon/hadith-rotation";
import {
  filterAnnouncementsIntelligently,
  type AnnouncementItem,
} from "@/lib/moon/announcement-manager";
import { gregorianToHijri, getCurrentIslamicDate, gregorianToHijriSA } from "@/lib/hijri";
import { db } from "@/lib/db";

/**
 * GET /api/moon-sighting
 *
 * Returns the full intelligent moon-sighting + announcement state:
 *  - Current Hijri date (with Aladhan API verification if available)
 *  - Astronomical conjunction time for the upcoming month (UTC + SAST)
 *  - Visibility assessment for Southern Africa (Yallop criterion)
 *  - Moon age, altitude, elongation, illumination at sunset on the 29th
 *  - 30-day completion prediction (if crescent cannot be sighted)
 *  - Auto-generated announcement text
 *  - Intelligent announcement filtering (last-week suppression, etc.)
 *  - Rotating hadith (3-month cycle, no repeats)
 *  - Month-transition hadith (for the upcoming month)
 *  - Month-usher hadith (for early-month welcoming)
 *  - Headline slide deck (contextually appropriate)
 *
 * All calculations use Johannesburg coordinates (26.20°S, 28.05°E).
 * Aladhan API + FarmSense Moon-Phase API are used for enrichment with
 * graceful fallback to local astronomical calculations.
 */
export async function GET() {
  try {
    const now = new Date();
    // Use getCurrentIslamicDate which applies:
    //   1. South African sighting offset (SA calendar is 1 day behind Umm al-Qura)
    //   2. Night-precedes-day rule (Islamic day starts at Maghrib/sunset)
    const todayHijri = getCurrentIslamicDate(now);

    // Calculate moon-sighting info (with API enrichment)
    const moonInfo: MoonSightingInfo = await getMoonSightingInfo(
      todayHijri.year, todayHijri.month, todayHijri.day,
    );

    // Get themed hadith for the upcoming month
    const theme = getMonthTheme(moonInfo.nextHijriMonth);
    const transitionHadith = getMonthTransitionHadith(moonInfo.nextHijriMonth);
    const usherHadith = getMonthUsherHadith(todayHijri.month);
    const rotatingHadith = getRotatingHadith(todayHijri.month, todayHijri.year);
    const rotatingSet = getRotatingHadithSet(todayHijri.month, todayHijri.year, 5);

    // Determine mode flags
    const nearMonthEnd = isNearMonthEnd(todayHijri.day);
    const inLastWeek = isInLastWeek(todayHijri.day);

    // Load announcements from DB (if available)
    let dbAnnouncements: AnnouncementItem[] = [];
    try {
      const dbAnns = await db.announcement.findMany({
        orderBy: { id: "desc" },
        take: 20,
      });
      dbAnnouncements = dbAnns.map(a => ({
        id: a.id, title: a.title, body: a.body, date: a.date, kind: a.kind,
      }));
    } catch { /* DB not available — use empty list */ }

    // Always include the dynamically-generated moon-sighting announcement
    // (only if we're in the last-week window and not suppressed)
    const dynamicMoonAnnouncement: AnnouncementItem | null =
      (inLastWeek && !moonInfo.suppressAlert) ? {
        id: -1, // sentinel for dynamic
        title: moonInfo.announcementTitle,
        body: moonInfo.announcementBody,
        date: now.toISOString().split("T")[0],
        kind: "moon",
      } : null;

    const allAnnouncements = dynamicMoonAnnouncement
      ? [dynamicMoonAnnouncement, ...dbAnnouncements]
      : dbAnnouncements;

    // Run the intelligent filter
    const filterResult = filterAnnouncementsIntelligently(
      allAnnouncements,
      todayHijri.year,
      todayHijri.month,
      todayHijri.day,
      moonInfo.announcementTitle,
      moonInfo.suppressAlert,
    );

    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      currentDate: {
        hijri: todayHijri.formattedLatin,
        hijriArabic: todayHijri.formattedArabic,
        gregorian: now.toDateString(),
        hijriDay: todayHijri.day,
        hijriMonth: todayHijri.month,
        hijriYear: todayHijri.year,
        hijriMonthName: HIJRI_MONTH_NAMES[todayHijri.month - 1],
        hijriMonthNameAr: HIJRI_MONTH_NAMES_AR[todayHijri.month - 1],
        weekdayArabic: todayHijri.weekdayArabic,
        // SA sighting date (with Maghrib rule) — this is the authoritative Islamic date
        saSightingVerified: todayHijri.formattedLatin,
        // Aladhan API returns Umm al-Qura date (for reference; may differ by 1 day)
        aladhanVerified: moonInfo.apiEnrichment?.aladhanHijriDate || null,
        calendarSystem: "South African Moon-Sighting (with Maghrib rule)",
      },
      moonSighting: {
        currentHijriMonth: moonInfo.currentHijriMonth,
        currentHijriMonthName: moonInfo.currentHijriMonthName,
        currentHijriDay: moonInfo.currentHijriDay,
        upcomingMonth: moonInfo.nextHijriMonthName,
        upcomingMonthArabic: moonInfo.nextHijriMonthNameAr,
        upcomingYear: moonInfo.nextHijriYear,
        conjunctionTimeUtc: moonInfo.conjunctionTimeUtc.toISOString(),
        conjunctionTimeLocal: moonInfo.conjunctionTimeLocal,
        sunsetTimeUtc: moonInfo.sunsetTimeUtc.toISOString(),
        sunsetTimeLocal: moonInfo.sunsetTimeLocal,
        moonsetTimeUtc: moonInfo.moonsetTimeUtc.toISOString(),
        moonsetTimeLocal: moonInfo.moonsetTimeLocal,
        observationWindowStartUtc: moonInfo.observationWindowStartUtc.toISOString(),
        observationWindowEndUtc: moonInfo.observationWindowEndUtc.toISOString(),
        moonAgeAtSunset: moonInfo.moonAgeAtSunsetHours,
        moonAltitudeAtSunset: moonInfo.moonAltitudeAtSunsetDeg,
        elongation: moonInfo.elongationDeg,
        illumination: moonInfo.illuminationPercent,
        visibility: moonInfo.visibility,
        visibilityNote: moonInfo.visibilityNote,
        yallopQ: moonInfo.yallopQ,
        willComplete30Days: moonInfo.willComplete30Days,
        daysUntilObservation: moonInfo.daysUntilObservation,
        daysUntilNewMonth: moonInfo.daysUntilNewMonth,
        dataSource: moonInfo.dataSource,
        apiEnrichment: moonInfo.apiEnrichment || null,
        suppressAlert: moonInfo.suppressAlert,
        suppressReason: moonInfo.suppressReason || null,
      },
      announcement: {
        title: moonInfo.announcementTitle,
        body: moonInfo.announcementBody,
      },
      monthTheme: {
        title: theme.title,
        titleAr: theme.titleAr,
        hadith: theme.hadith,
        source: theme.source,
        encourage: theme.encourage,
        specialDays: theme.specialDays || null,
      },
      hadithRotation: {
        current: {
          text: rotatingHadith.text,
          source: rotatingHadith.source,
          theme: rotatingHadith.theme,
        },
        transition: transitionHadith ? {
          text: transitionHadith.text,
          source: transitionHadith.source,
          theme: transitionHadith.theme,
        } : null,
        usher: usherHadith ? {
          text: usherHadith.text,
          source: usherHadith.source,
          theme: usherHadith.theme,
        } : null,
        rotatingSet: rotatingSet.map(h => ({
          text: h.text, source: h.source, theme: h.theme,
        })),
      },
      intelligentFilter: {
        mode: filterResult.mode,
        reason: filterResult.reason,
        nearMonthEnd,
        inLastWeek,
        activeCount: filterResult.activeAnnouncements.length,
        expiredCount: filterResult.expiredAnnouncements.length,
        expiredReasons: filterResult.expiredAnnouncements.map(a => ({
          id: a.id, title: a.title, reason: a.body.split("[Suppressed:")[1]?.replace("]", "").trim() || "Suppressed",
        })),
        headlineSlides: filterResult.headlineSlides,
      },
      nearMonthEnd,
      inLastWeek,
    });
  } catch (error) {
    console.error("Moon sighting API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate moon sighting data", details: String(error) },
      { status: 500 },
    );
  }
}
