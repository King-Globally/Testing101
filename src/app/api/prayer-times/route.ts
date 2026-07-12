import { NextResponse } from "next/server";
import { getLivePrayerTimes, getAstronomicalPrayerTimes } from "@/lib/solar";

/**
 * GET /api/prayer-times
 *
 * Returns accurate prayer times for Johannesburg (26.2041°S, 28.0473°E).
 * Tries the Aladhan API first (method=2 ISNA, school=1 Hanafi) for live
 * verification, falls back to local astronomical calculation if unavailable.
 *
 * Note: Fajr and Isha times here are astronomical. The actual Masjid Al-Farooq
 * jama'ah times are managed separately in the prayer schedule. This endpoint
 * only provides the astronomically-accurate Sunrise and Maghrib times, which
 * override the schedule.
 */
export async function GET() {
  try {
    const now = new Date();
    const { times, source, apiVerified } = await getLivePrayerTimes(now);

    // Cache for 1 hour on the client (prayer times don't change within an hour)
    return NextResponse.json({
      success: true,
      generatedAt: now.toISOString(),
      source,           // "api" or "local"
      apiVerified,      // true if Aladhan API responded
      coordinates: {
        latitude: -26.2041,
        longitude: 28.0473,
        city: "Johannesburg",
        region: "Gauteng, South Africa",
      },
      times: {
        fajr: times.fajr,
        sunrise: times.sunrise,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
      },
      method: source === "api" ? "Aladhan API (ISNA method, Hanafi school)" : "Local NOAA Solar Calculation",
      cachedUntil: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Prayer times API error:", error);
    // Final fallback to local calculation
    const times = getAstronomicalPrayerTimes(new Date());
    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      source: "local",
      apiVerified: false,
      times,
      method: "Local NOAA Solar Calculation (fallback)",
    });
  }
}
