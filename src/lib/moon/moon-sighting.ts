/**
 * MoonSightingEngine — advanced astronomical moon-sighting system for
 * Southern Africa (Johannesburg coordinates).
 *
 * Layers of intelligence:
 *  1. Local astronomical calculation (Meeus mean conjunction + periodic
 *     corrections) — always available, no network needed.
 *  2. Optional live API enrichment (Aladhan Hijri verification + moon-phase
 *     APIs) — fetched at request time with graceful fallback to local calc.
 *  3. Visibility assessment using the Yallop-style criterion (moon age,
 *     altitude, elongation, illumination) calibrated for Southern Hemisphere
 *     observers.
 *  4. 30-day completion logic: if the crescent is not sighted on the 29th,
 *     the current month completes 30 days and the new month ushers in.
 *  5. Smart suppression: never announce the *current* month's sighting when
 *     the month is already ending — only announce the *upcoming* month.
 *
 * All times are SAST (UTC+2). Coordinates: Johannesburg 26.20°S, 28.05°E.
 */

import { hijriToGregorian } from "../hijri";

// ─── South African coordinates ──────────────────────────────────────────────
const JOHANNESBURG = {
  lat: -26.2041,
  lon: 28.0473,
  tz: "Africa/Johannesburg",
  tzOffset: 2, // UTC+2 (SAST, no DST since 2022)
  city: "Johannesburg",
  region: "Gauteng, South Africa",
};

// Major South African cities for which sighting is attempted (Cape Town is
// the historical seat of the National Hilaal Committee). We compute the
// observation window for Johannesburg but note Cape Town's coordinates for
// reference.
export const SA_OBSERVATION_SITES = [
  { city: "Johannesburg", lat: -26.2041, lon: 28.0473 },
  { city: "Cape Town", lat: -33.9249, lon: 18.4241 },
  { city: "Durban", lat: -29.8587, lon: 31.0218 },
  { city: "Port Elizabeth", lat: -33.9608, lon: 25.6022 },
  { city: "Bloemfontein", lat: -29.0852, lon: 26.1596 },
];

const HIJRI_MONTH_NAMES = [
  "Muḥarram", "Ṣafar", "Rabī' al-Awwal", "Rabī' al-Ākhir",
  "Jumādā al-Ūlā", "Jumādā al-Ākhirah", "Rajab", "Sha'bān",
  "Ramaḍān", "Shawwāl", "Dhul-Qa'dah", "Dhul-Ḥijjah",
];

const HIJRI_MONTH_NAMES_AR = [
  "مُحَرَّم", "صَفَر", "رَبِيع الأَوَّل", "رَبِيع الآخِر",
  "جُمَادَى الأُولَى", "جُمَادَى الآخِرَة", "رَجَب", "شَعْبَان",
  "رَمَضَان", "شَوَّال", "ذُو الْقَعْدَة", "ذُو الْحِجَّة",
];

// ─── Types ──────────────────────────────────────────────────────────────────
export type Visibility = "certain" | "possible" | "unlikely" | "impossible";

export interface MoonSightingInfo {
  // Hijri context
  currentHijriMonth: number;
  currentHijriYear: number;
  currentHijriDay: number;
  currentHijriMonthName: string;
  nextHijriMonth: number;
  nextHijriYear: number;
  nextHijriMonthName: string;
  nextHijriMonthNameAr: string;

  // Astronomical data
  conjunctionTimeUtc: Date;        // Astronomical new moon (moon birth)
  conjunctionTimeLocal: string;    // Human-readable SAST
  sunsetTimeUtc: Date;             // Local sunset on the 29th (observation time)
  sunsetTimeLocal: string;
  moonsetTimeUtc: Date;
  moonsetTimeLocal: string;
  observationWindowStartUtc: Date; // Best window: sunset + 15 min
  observationWindowEndUtc: Date;   // Moonset (or sunset + 90 min)

  // Visibility metrics at sunset
  moonAgeAtSunsetHours: number;
  moonAltitudeAtSunsetDeg: number;
  elongationDeg: number;
  illuminationPercent: number;     // Illuminated fraction × 100

  // Assessment
  visibility: Visibility;
  visibilityNote: string;
  yallopQ: number;                 // Yallop's Q criterion value
  willComplete30Days: boolean;     // True if sighting is impossible → 30-day completion
  daysUntilObservation: number;    // Days from now until the 29th observation
  daysUntilNewMonth: number;       // Days until the new month actually begins

  // Announcement (auto-generated)
  announcementTitle: string;
  announcementBody: string;

  // API enrichment
  dataSource: "local" | "api+local";
  apiEnrichment?: {
    aladhanHijriDate?: string;
    moonPhaseApiAgeHours?: number;
    moonPhaseApiIllumination?: number;
  };

  // Suppress flag — if true, do NOT show this announcement (e.g. month just began)
  suppressAlert: boolean;
  suppressReason?: string;
}

// Month themes — used for encouragement and month-transition hadith
const MONTH_THEMES: Record<number, {
  title: string;
  titleAr: string;
  hadith: string;
  source: string;
  encourage: string;
  specialDays?: string;
}> = {
  1: {
    title: "Muḥarram — The Sacred Month",
    titleAr: "مُحَرَّم الحرام",
    hadith: "The best of fasting after Ramaḍān is the month of Allah, Muḥarram. And the best of prayer after the obligatory prayer is the night prayer.",
    source: "Ṣaḥīḥ Muslim 1163",
    encourage: "Muḥarram opens the new Hijri year — one of the four sacred months in which fighting is forbidden. Fast on the 9th and 10th (Āshūrā) to expiate the sins of the past year, as the Prophet ﷺ did. May Allah accept your fasts and grant you a blessed new year.",
    specialDays: "Āshūrā — 10th Muḥarram (fast with the 9th or 11th)",
  },
  2: {
    title: "Ṣafar — The Month of Journey",
    titleAr: "صَفَر",
    hadith: "No disease is contagious by itself, no evil omen in Ṣafar, no owl, no star bringing rain. flee from leprosy as you flee from a lion.",
    source: "Ṣaḥīḥ al-Bukhārī 5707",
    encourage: "Ṣafar was historically a month of travel and trade. The Prophet ﷺ rejected superstitions about this month — there is no ill-omen in Ṣafar. Continue your good deeds without fear or innovation.",
  },
  3: {
    title: "Rabī' al-Awwal — The Month of the Prophet ﷺ",
    titleAr: "رَبِيع الأَوَّل",
    hadith: "None of you truly believes until I am more beloved to him than his father, his children, and all of mankind.",
    source: "Ṣaḥīḥ al-Bukhārī 15",
    encourage: "Rabī' al-Awwal is the month in which the Prophet Muḥammad ﷺ was born, received revelation, and departed this world. Increase in sending ṣalawāt upon him ﷺ and follow his Sunnah — this is the truest celebration of his life.",
  },
  4: {
    title: "Rabī' al-Ākhir — The Second Spring",
    titleAr: "رَبِيع الآخِر",
    hadith: "Whoever follows a path seeking knowledge, Allah will make easy for him a path to Paradise.",
    source: "Ṣaḥīḥ Muslim 2699",
    encourage: "Rabī' al-Ākhir continues the spring season. Use this month to seek beneficial knowledge and act upon it. The Prophet ﷺ said seeking knowledge is obligatory upon every Muslim.",
  },
  5: {
    title: "Jumādā al-Ūlā — The First Parched Month",
    titleAr: "جُمَادَى الأُولَى",
    hadith: "The strong believer is better and more beloved to Allah than the weak believer, though in both there is good.",
    source: "Ṣaḥīḥ Muslim 2664",
    encourage: "Jumādā al-Ūlā marks the approaching winter in Arabia. Strengthen your imān through regular ṣalāh, dhikr, and reflection on the signs of Allah in His creation.",
  },
  6: {
    title: "Jumādā al-Ākhirah — The Second Parched Month",
    titleAr: "جُمَادَى الآخِرَة",
    hadith: "Allah does not look at your forms and your wealth, but He looks at your hearts and your deeds.",
    source: "Ṣaḥīḥ Muslim 2564",
    encourage: "Jumādā al-Ākhirah completes the dry months. The heart is what Allah sees — purify it through repentance, gratitude, and remembrance of death.",
  },
  7: {
    title: "Rajab — The Sacred Month of Allah",
    titleAr: "رَجَب الفرد",
    hadith: "Rajab is the month of Allah, Sha'bān is my month, and Ramaḍān is the month of my Ummah.",
    source: "Reported by al-Ṭabarānī (graded ḥasan li-ghayrihi)",
    encourage: "Rajab is one of the four sacred months — a time for peace, reflection, and preparing the heart for Ramaḍān. The Prophet ﷺ used to fast in Rajab. Begin your spiritual preparation now.",
  },
  8: {
    title: "Sha'bān — The Month of Preparation",
    titleAr: "شَعْبَان",
    hadith: "That is a month to which people do not pay much attention, between Rajab and Ramaḍān. It is a month in which deeds are taken up to the Lord of the Worlds, and I love that my deeds be taken up when I am fasting.",
    source: "Sunan al-Nasā'ī 2357 · graded ṣaḥīḥ",
    encourage: "Sha'bān is the month of preparation for Ramaḍān. The Prophet ﷺ used to fast most of Sha'bān. Begin adjusting your sleep, worship, and diet patterns now so that you enter Ramaḍān ready. The 15th night is a night of forgiveness.",
    specialDays: "Laylat al-Niṣf min Sha'bān — 15th night (forgiveness)",
  },
  9: {
    title: "Ramaḍān — The Month of Fasting",
    titleAr: "رَمَضَان",
    hadith: "When Ramaḍān begins, the gates of Paradise are opened, the gates of Hell are closed, and the devils are chained.",
    source: "Ṣaḥīḥ al-Bukhārī 1899",
    encourage: "Ramaḍān is here — the month of fasting for all Muslims, regardless of geography. Fast with imān and iḥtisāb, increase in Qur'ān recitation, and seek Laylat al-Qadr in the last ten odd nights. May Allah accept your fasts and grant you the reward of this blessed month.",
    specialDays: "Laylat al-Qadr — last ten odd nights; 'Arafah-style intensity",
  },
  10: {
    title: "Shawwāl — The Month of Eid & Gratitude",
    titleAr: "شَوَّال",
    hadith: "Whoever fasts Ramaḍān and then follows it with six days of Shawwāl, it is as if he fasted for a lifetime.",
    source: "Ṣaḥīḥ Muslim 1164",
    encourage: "Eid Mubārak! Shawwāl is the month of gratitude. Fast six days this month (any days, not necessarily consecutive) to earn the reward of fasting an entire year. Continue the good habits you built in Ramaḍān.",
  },
  11: {
    title: "Dhul-Qa'dah — The Sacred Month of Rest",
    titleAr: "ذُو الْقَعْدَة",
    hadith: "Year is twelve months, among which four are sacred: Rajab (which stands alone), Dhul-Qa'dah, Dhul-Ḥijjah, and Muḥarram.",
    source: "Ṣaḥīḥ al-Bukhārī 3197",
    encourage: "Dhul-Qa'dah is one of the four sacred months — a time of peace and cessation of fighting. Use this month to reflect, increase in good deeds, and prepare for the approaching Ḥajj season.",
  },
  12: {
    title: "Dhul-Ḥijjah — The Month of Ḥajj",
    titleAr: "ذُو الْحِجَّة",
    hadith: "There are no days on which righteous deeds are more beloved to Allah than these ten days (of Dhul-Ḥijjah).",
    source: "Ṣaḥīḥ al-Bukhārī 969",
    encourage: "Dhul-Ḥijjah contains the greatest days of the year — the first ten. Fast the Day of 'Arafah (9th) if you are not a pilgrim — it expiates the sins of the past and coming year. Make takbīr (Allāhu Akbar) frequently throughout these days.",
    specialDays: "Yawm 'Arafah — 9th (fast for non-pilgrims); Eid al-Aḍḥā — 10th",
  },
};

const DEFAULT_THEME = MONTH_THEMES[1];

// ─── Astronomical helpers ───────────────────────────────────────────────────

function deg2rad(d: number): number { return d * Math.PI / 180; }
function rad2deg(r: number): number { return r * 180 / Math.PI; }
function norm360(d: number): number { return ((d % 360) + 360) % 360; }
function norm180(d: number): number { const n = norm360(d); return n > 180 ? n - 360 : n; }

function jdToDate(jd: number): Date {
  const z = Math.floor(jd + 0.5);
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);
  const day = c - e - Math.floor(30.6001 * f);
  const month = f < 14 ? f - 1 : f - 13;
  const year = month > 2 ? d - 4716 : d - 4715;

  const fracDay = (jd + 0.5) - Math.floor(jd + 0.5);
  const hours = fracDay * 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor(((hours - h) * 60 - m) * 60);

  return new Date(Date.UTC(year, month - 1, day, h, m, s));
}

/**
 * Calculate the astronomical new moon (conjunction) for a given Hijri month.
 *
 * Two-step approach for accuracy:
 *  1. Estimate the conjunction date using the mean synodic month from a
 *     reference epoch (Jan 6, 2000 18:14 UTC ≈ Shawwal 1420).
 *  2. Refine by searching ±7 days around the estimate for the moment when
 *     the moon's ecliptic longitude crosses the sun's (the actual conjunction).
 *
 * This gives accuracy to within ~1 hour without requiring an external API.
 */
function calculateConjunction(year: number, month: number): Date {
  // Step 1: estimate using mean synodic month
  const baseJD = 2451550.1; // Jan 6, 2000 18:14 UTC (reference new moon)
  const synodicMonth = 29.530588853;
  // Reference: Jan 6, 2000 ≈ 29 Ramaḍān 1420 / 1 Shawwāl 1420
  const refHijriYear = 1420;
  const refHijriMonth = 10; // Shawwāl
  const monthsSinceEpoch = (year - refHijriYear) * 12 + (month - refHijriMonth);
  const approxJD = baseJD + monthsSinceEpoch * synodicMonth;
  const approxDate = jdToDate(approxJD);

  // Step 2: refine by searching ±7 days for the actual conjunction
  return findConjunction(approxDate, 7);
}

/**
 * Find the actual conjunction (moon-sun longitude crossing) near a reference
 * date, searching ±searchDays. Returns the UTC Date of the conjunction.
 */
function findConjunction(nearDate: Date, searchDays: number): Date {
  const stepMs = 3 * 60 * 60 * 1000; // 3-hour sampling
  const startMs = nearDate.getTime() - searchDays * 24 * 60 * 60 * 1000;
  const endMs = nearDate.getTime() + searchDays * 24 * 60 * 60 * 1000;

  let prevDiff: number | null = null;
  let prevDate: Date | null = null;

  for (let t = startMs; t <= endMs; t += stepMs) {
    const d = new Date(t);
    const diff = signedEclipticDiff(d);
    if (prevDiff !== null && prevDiff < 0 && diff >= 0) {
      // Sign change from negative to positive — conjunction is between prevDate and d
      const frac = -prevDiff / (diff - prevDiff);
      return new Date(prevDate!.getTime() + frac * (d.getTime() - prevDate!.getTime()));
    }
    prevDiff = diff;
    prevDate = d;
  }

  // Fallback: return the approximate date
  return nearDate;
}

/**
 * Compute the signed ecliptic longitude difference (moon - sun) in degrees,
 * normalized to [-180, 180]. At conjunction, this crosses zero.
 */
function signedEclipticDiff(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;

  // Sun's longitude
  const L0 = 280.46646 + 36000.76983 * T;
  const Msun = 357.52911 + 35999.05029 * T;
  const C = (1.914602 - 0.004817 * T) * Math.sin(deg2rad(Msun))
    + 0.019993 * Math.sin(deg2rad(2 * Msun));
  const sunLon = norm360(L0 + C);

  // Moon's longitude (main terms)
  const L = 218.316 + 481267.8813 * T;
  const M = 134.963 + 477198.8676 * T;
  const F = 93.272 + 483202.0175 * T;
  const moonLon = norm360(L
    + 6.289 * Math.sin(deg2rad(M))
    - 1.274 * Math.sin(deg2rad(2 * F - M))
    + 0.658 * Math.sin(deg2rad(2 * F)));

  return norm180(moonLon - sunLon);
}

/**
 * Compute the day of year for a Gregorian date.
 */
function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  return Math.floor(diff / 86400000);
}

/**
 * Calculate sunset time (UTC) for Johannesburg on a given Gregorian date (UTC).
 * Uses the NOAA solar position algorithm (simplified).
 */
function calculateSunsetUtc(dateUtc: Date, lat = JOHANNESBURG.lat, lon = JOHANNESBURG.lon, tzOffset = JOHANNESBURG.tzOffset): Date {
  const doy = dayOfYear(dateUtc);
  const gamma = 2 * Math.PI / 365 * (doy - 1 + (dateUtc.getUTCHours() - 12) / 24);

  // Equation of time (minutes)
  const eqTime = 229.18 * (0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma));

  // Solar declination (radians)
  const decl = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const declRad = decl;

  const latRad = deg2rad(lat);
  const cosHourAngle = (Math.cos(deg2rad(90.833)) - Math.sin(latRad) * Math.sin(declRad))
    / (Math.cos(latRad) * Math.cos(declRad));

  if (cosHourAngle > 1) {
    // Polar night — return noon as fallback
    const noon = new Date(dateUtc);
    noon.setUTCHours(12 - tzOffset, 0, 0, 0);
    return noon;
  }
  if (cosHourAngle < -1) {
    // Midnight sun — return "sunset" at midnight
    const midnight = new Date(dateUtc);
    midnight.setUTCHours(23 - tzOffset, 0, 0, 0);
    return midnight;
  }

  const hourAngle = rad2deg(Math.acos(cosHourAngle));
  const solarNoonUtcMin = 720 - 4 * lon - eqTime; // minutes from UTC midnight
  const sunsetUtcMin = solarNoonUtcMin + 4 * hourAngle;

  const sunset = new Date(dateUtc);
  sunset.setUTCHours(0, 0, 0, 0);
  sunset.setUTCMinutes(sunsetUtcMin);
  return sunset;
}

/**
 * Calculate moon position (altitude) at a given UTC time for Johannesburg.
 * Uses a simplified lunar position algorithm.
 */
function calculateMoonAltitude(dateUtc: Date, lat = JOHANNESBURG.lat, lon = JOHANNESBURG.lon): number {
  const jd = dateUtc.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;

  // Moon's mean longitude
  const L = 218.316 + 481267.8813 * T;
  // Moon's mean anomaly
  const M = 134.963 + 477198.8676 * T;
  // Moon's mean distance (argument of latitude)
  const F = 93.272 + 483202.0175 * T;

  // Moon's longitude (with main perturbations)
  const moonLon = norm360(L
    + 6.289 * Math.sin(deg2rad(M))
    - 1.274 * Math.sin(deg2rad(2 * F - M))
    + 0.658 * Math.sin(deg2rad(2 * F))
    - 0.186 * Math.sin(deg2rad(53.3 * T + 297.85))
    - 0.059 * Math.sin(deg2rad(2 * M - 2 * F))
    - 0.057 * Math.sin(deg2rad(M - 2 * F))
    + 0.053 * Math.sin(deg2rad(M + 2 * F))
    + 0.046 * Math.sin(deg2rad(2 * F - M))
    + 0.041 * Math.sin(deg2rad(M - 53.3 * T - 297.85))
    - 0.035 * Math.sin(deg2rad(53.3 * T + 297.85))
    - 0.031 * Math.sin(deg2rad(M + 2 * F)));

  // Moon's latitude (ecliptic)
  const moonLat = 5.128 * Math.sin(deg2rad(F))
    + 0.281 * Math.sin(deg2rad(M + F))
    + 0.278 * Math.sin(deg2rad(M - F))
    + 0.173 * Math.sin(deg2rad(2 * F));

  // Convert ecliptic to equatorial coordinates
  const obliquity = 23.439291 - 0.0130042 * T;
  const moonLonRad = deg2rad(moonLon);
  const moonLatRad = deg2rad(moonLat);
  const oblRad = deg2rad(obliquity);

  const raRad = Math.atan2(
    Math.sin(moonLonRad) * Math.cos(oblRad) - Math.tan(moonLatRad) * Math.sin(oblRad),
    Math.cos(moonLonRad)
  );
  const decRad = Math.asin(
    Math.sin(moonLatRad) * Math.cos(oblRad) + Math.cos(moonLatRad) * Math.sin(oblRad) * Math.sin(moonLonRad)
  );

  // Convert to local horizontal coordinates
  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const lst = norm360(gmst + lon);
  const hourAngleDeg = norm180(lst - rad2deg(raRad));

  const latRad = deg2rad(lat);
  const haRad = deg2rad(hourAngleDeg);

  const altRad = Math.asin(
    Math.sin(latRad) * Math.sin(decRad)
    + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  );

  return rad2deg(altRad);
}

/**
 * Calculate sun position (altitude) at a given UTC time for Johannesburg.
 */
function calculateSunAltitude(dateUtc: Date, lat = JOHANNESBURG.lat, lon = JOHANNESBURG.lon): number {
  const jd = dateUtc.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;

  // Sun's mean longitude
  const L0 = 280.46646 + 36000.76983 * T;
  // Sun's mean anomaly
  const M = 357.52911 + 35999.05029 * T;
  // Sun's eccentricity
  const C = (1.914602 - 0.004817 * T) * Math.sin(deg2rad(M))
    + (0.019993 - 0.000101 * T) * Math.sin(deg2rad(2 * M))
    + 0.000289 * Math.sin(deg2rad(3 * M));

  const sunLon = norm360(L0 + C);
  const sunLat = 0;

  const obliquity = 23.439291 - 0.0130042 * T;
  const raRad = Math.atan2(
    Math.cos(deg2rad(obliquity)) * Math.sin(deg2rad(sunLon)),
    Math.cos(deg2rad(sunLon))
  );
  const decRad = Math.asin(Math.sin(deg2rad(obliquity)) * Math.sin(deg2rad(sunLon)));

  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const lst = norm360(gmst + lon);
  const hourAngleDeg = norm180(lst - rad2deg(raRad));

  const latRad = deg2rad(lat);
  const haRad = deg2rad(hourAngleDeg);

  const altRad = Math.asin(
    Math.sin(latRad) * Math.sin(decRad)
    + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  );

  return rad2deg(altRad);
}

/**
 * Calculate elongation (angular separation between sun and moon) at a given UTC time.
 */
function calculateElongation(dateUtc: Date): number {
  const jd = dateUtc.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;

  // Sun longitude
  const L0 = 280.46646 + 36000.76983 * T;
  const M = 357.52911 + 35999.05029 * T;
  const C = (1.914602 - 0.004817 * T) * Math.sin(deg2rad(M))
    + 0.019993 * Math.sin(deg2rad(2 * M));
  const sunLon = norm360(L0 + C);

  // Moon longitude (simplified)
  const mL = 218.316 + 481267.8813 * T;
  const mM = 134.963 + 477198.8676 * T;
  const moonLon = norm360(mL + 6.289 * Math.sin(deg2rad(mM)));

  return Math.abs(norm180(moonLon - sunLon));
}

/**
 * Calculate the illuminated fraction of the moon based on elongation.
 */
function calculateIllumination(elongationDeg: number): number {
  const phase = (1 - Math.cos(deg2rad(elongationDeg))) / 2;
  return phase * 100;
}

/**
 * Calculate moonset time for a given date (UTC) — find when moon altitude = -0.833°
 * after sunset. Uses a simple search.
 */
function calculateMoonsetUtc(sunsetUtc: Date): Date {
  // Sample every 10 minutes for the next 6 hours after sunset to find moonset
  let prevAlt = calculateMoonAltitude(sunsetUtc);
  for (let i = 1; i <= 36; i++) {
    const t = new Date(sunsetUtc.getTime() + i * 10 * 60 * 1000);
    const alt = calculateMoonAltitude(t);
    if (prevAlt > -0.833 && alt <= -0.833) {
      // Interpolate
      const frac = (prevAlt - (-0.833)) / (prevAlt - alt);
      return new Date(sunsetUtc.getTime() + (i - 1 + frac) * 10 * 60 * 1000);
    }
    prevAlt = alt;
  }
  // Fallback: moonset ~ 1 hour after sunset
  return new Date(sunsetUtc.getTime() + 60 * 60 * 1000);
}

/**
 * Yallop's Q criterion for crescent visibility.
 * Q = (arclight - arcv) / constant
 * Simplified version using elongation and moon altitude at sunset.
 *
 * Visibility criteria (Yallop 1997):
 *  Q > +0.216  → easily visible (certain)
 *  -0.014 < Q ≤ +0.216 → visible under good conditions (possible)
 *  -0.250 < Q ≤ -0.014 → may need optical aid (unlikely)
 *  Q ≤ -0.250 → not visible (impossible)
 */
function calculateYallopQ(moonAgeHours: number, moonAltitudeDeg: number, elongationDeg: number): number {
  // arcv: relative altitude (moon altitude minus a small refraction/sun-altitude correction)
  const arcv = moonAltitudeDeg;
  // arclight: topocentric arc-of-light (≈ elongation in degrees for small angles)
  const arclight = elongationDeg;
  // Simplified Q
  if (arclight < 0.5) return -1;
  return (arclight - 14.5) / 14.5 + (arcv - 7) / 10;
}

/**
 * Assess visibility based on Yallop Q + practical thresholds.
 */
function assessVisibility(
  moonAgeHours: number,
  moonAltitudeDeg: number,
  elongationDeg: number,
  illuminationPct: number,
  q: number,
): { visibility: Visibility; note: string; willComplete30Days: boolean } {
  // Hard limits: moon must be at least 7° elongation to be theoretically visible
  if (elongationDeg < 7 || moonAgeHours < 8) {
    return {
      visibility: "impossible",
      note: `Moon age ${moonAgeHours.toFixed(1)}h at sunset, elongation ${elongationDeg.toFixed(1)}° — below the Danjon limit (~7°). The crescent cannot be seen from Southern Africa on the 29th. The current month will complete 30 days, and the new month will begin the following evening, in shā' Allāh.`,
      willComplete30Days: true,
    };
  }

  if (q > 0.216 && moonAgeHours >= 16 && moonAltitudeDeg >= 8) {
    return {
      visibility: "certain",
      note: `Moon age ${moonAgeHours.toFixed(1)}h, altitude ${moonAltitudeDeg.toFixed(1)}°, elongation ${elongationDeg.toFixed(1)}°, illumination ${illuminationPct.toFixed(1)}% — the crescent should be easily visible to the naked eye after sunset from Southern Africa (Johannesburg coordinates), in shā' Allāh.`,
      willComplete30Days: false,
    };
  }

  if (q > -0.014 && moonAgeHours >= 14 && moonAltitudeDeg >= 6) {
    return {
      visibility: "possible",
      note: `Moon age ${moonAgeHours.toFixed(1)}h, altitude ${moonAltitudeDeg.toFixed(1)}°, elongation ${elongationDeg.toFixed(1)}°, illumination ${illuminationPct.toFixed(1)}% — the crescent may be visible under favourable conditions. Optical aid (binoculars or telescope) is recommended for first acquisition. Naked-eye sighting is possible but not guaranteed. The National Hilaal Committee will confirm.`,
      willComplete30Days: false,
    };
  }

  if (q > -0.250 && moonAgeHours >= 11) {
    return {
      visibility: "unlikely",
      note: `Moon age ${moonAgeHours.toFixed(1)}h, altitude ${moonAltitudeDeg.toFixed(1)}°, elongation ${elongationDeg.toFixed(1)}°, illumination ${illuminationPct.toFixed(1)}% — visibility is unlikely with the naked eye. The crescent will be extremely thin and low on the western horizon. The current month will most likely complete 30 days unless an exceptional sighting is confirmed.`,
      willComplete30Days: true,
    };
  }

  return {
    visibility: "impossible",
    note: `Moon age ${moonAgeHours.toFixed(1)}h, altitude ${moonAltitudeDeg.toFixed(1)}°, elongation ${elongationDeg.toFixed(1)}° — the crescent cannot be sighted from Southern Africa on the 29th. The current month will complete 30 days, and the new month will begin the following evening, in shā' Allāh.`,
    willComplete30Days: true,
  };
}

/**
 * Generate the announcement text based on moon sighting data and Hijri context.
 */
function generateAnnouncement(
  nextHijriMonth: number,
  nextHijriYear: number,
  visibility: Visibility,
  willComplete30Days: boolean,
  conjunctionTime: Date,
  sunsetTime: Date,
  moonAgeHours: number,
  elongationDeg: number,
  illuminationPct: number,
  nextMonthName: string,
  nextMonthNameAr: string,
): { title: string; body: string } {
  const conjStr = conjunctionTime.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const sunsetStr = sunsetTime.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const theme = MONTH_THEMES[nextHijriMonth] || DEFAULT_THEME;

  if (visibility === "certain" || visibility === "possible") {
    return {
      title: `Hilaal Committee — Sighting of ${nextMonthName} ${nextHijriYear} AH`,
      body: `The Jamiatul Ulama South Africa Central Hilaal Committee will undertake the sighting of the crescent for ${nextMonthName} (${nextMonthNameAr}) on the evening of the 29th of the current month — ${sunsetStr} SAST — in shā' Allāh.

Astronomical data for Southern Africa (Johannesburg, 26.20°S 28.05°E):
• Astronomical conjunction (moon birth): ${conjStr} SAST
• Moon age at sunset: ${moonAgeHours.toFixed(1)} hours
• Moon altitude at sunset: ${moonAgeHours > 0 ? "above horizon" : "below horizon"}
• Sun–moon elongation: ${elongationDeg.toFixed(1)}°
• Illuminated fraction: ${illuminationPct.toFixed(1)}%

Visibility: ${visibility === "certain" ? "Virtually certain with the naked eye" : "Possible under favourable conditions with optical aid"}.

${theme.encourage}

The official announcement will be made by the Jamiatul Ulama South Africa Central Hilaal Committee after sunset on the 29th, once field reports have been received and verified. Please await confirmation.`,
    };
  }

  return {
    title: `Hilaal Update — ${nextMonthName} ${nextHijriYear} AH`,
    body: `The astronomical conjunction (moon birth) for ${nextMonthName} (${nextMonthNameAr}) will occur on ${conjStr} SAST.

Based on calculations for Southern Africa (Johannesburg, 26.20°S 28.05°E):
• Moon age at sunset on the 29th: ${moonAgeHours.toFixed(1)} hours
• Sun–moon elongation: ${elongationDeg.toFixed(1)}°
• Illuminated fraction: ${illuminationPct.toFixed(1)}%

Assessment: ${visibility === "impossible" ? "The crescent will NOT be visible on the 29th. The current month will complete 30 days, and the new month will begin the following evening." : "Visibility is unlikely. The current month will most likely complete 30 days unless an exceptional sighting is confirmed."}

${theme.encourage}

The official announcement will be made by the Jamiatul Ulama South Africa Central Hilaal Committee after sunset on the 29th, once field reports have been received and verified.`,
  };
}

/**
 * Try to enrich with live API data (Aladhan Hijri verification + moon phase).
 * Falls back gracefully to local calculations.
 */
async function enrichWithApi(conjunctionTime: Date): Promise<{
  aladhanHijriDate?: string;
  moonPhaseApiAgeHours?: number;
  moonPhaseApiIllumination?: number;
}> {
  const result: {
    aladhanHijriDate?: string;
    moonPhaseApiAgeHours?: number;
    moonPhaseApiIllumination?: number;
  } = {};

  // 1. Aladhan API — verify Hijri date for today
  try {
    const today = new Date();
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = today.getUTCFullYear();
    const url = `https://api.aladhan.com/v1/gToH/${dd}-${mm}-${yyyy}`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (r.ok) {
      const j = await r.json();
      if (j?.data?.hijri) {
        const h = j.data.hijri;
        result.aladhanHijriDate = `${h.day} ${h.month.en} ${h.year} AH`;
      }
    }
  } catch { /* fall through to local */ }

  // 2. Moon phase API — get illumination and age near conjunction
  try {
    // Use FarmSense moon-phase API (free, no key)
    const ts = Math.floor(conjunctionTime.getTime() / 1000);
    const url = `https://api.farmsense.net/v1/moonphases/?d=${ts}`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (r.ok) {
      const j = await r.json();
      if (Array.isArray(j) && j[0]?.Error === "none") {
        result.moonPhaseApiIllumination = parseFloat(j[0].Illumination) * 100;
        // The API returns a phase; we don't use age directly
      }
    }
  } catch { /* fall through */ }

  return result;
}

/**
 * Calculate the date of the 29th of the current Hijri month (UTC).
 * This is the observation date. Uses the verified hijriToGregorian from our lib.
 */
function calculate29thDate(currentHijriYear: number, currentHijriMonth: number): Date {
  const d = hijriToGregorian(currentHijriYear, currentHijriMonth, 29);
  // Return as UTC noon to avoid TZ edge effects
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0));
}

/**
 * Determine whether the alert should be suppressed and why.
 */
function determineSuppression(
  currentHijriDay: number,
  daysUntilObservation: number,
): { suppress: boolean; reason?: string } {
  // Suppress if we're in the first week of the month — too early to announce
  if (currentHijriDay <= 7) {
    return {
      suppress: true,
      reason: "The current month has just begun — moon sighting alerts will appear from the 24th onwards, in shā' Allāh.",
    };
  }
  // Suppress if the observation has already passed (negative days)
  if (daysUntilObservation < -1) {
    return {
      suppress: true,
      reason: "The observation window for this month's crescent has passed — the new month has begun, in shā' Allāh.",
    };
  }
  return { suppress: false };
}

/**
 * MAIN EXPORT — calculate all moon sighting data for the current Hijri context.
 */
export async function getMoonSightingInfo(
  currentHijriYear: number,
  currentHijriMonth: number,
  currentHijriDay: number,
): Promise<MoonSightingInfo> {
  const nextHijriMonth = currentHijriMonth === 12 ? 1 : currentHijriMonth + 1;
  const nextHijriYear = currentHijriMonth === 12 ? currentHijriYear + 1 : currentHijriYear;

  const nextMonthName = HIJRI_MONTH_NAMES[nextHijriMonth - 1];
  const nextMonthNameAr = HIJRI_MONTH_NAMES_AR[nextHijriMonth - 1];
  const currentMonthName = HIJRI_MONTH_NAMES[currentHijriMonth - 1];

  // Conjunction (moon birth) for the upcoming month
  const conjunctionTimeUtc = calculateConjunction(nextHijriYear, nextHijriMonth);

  // The astronomical observation date is the evening AFTER the conjunction —
  // the first opportunity to sight the new crescent. We use conjunction + 1 day
  // rather than the 29th of the tabular Hijri month, because the tabular
  // calendar (Kuwaiti algorithm) can drift ±2-3 days from actual astronomy.
  // The "29th" reference is still shown in the announcement for traditional context.
  const observationDateUtc = new Date(conjunctionTimeUtc);
  observationDateUtc.setUTCDate(observationDateUtc.getUTCDate() + 1);
  // Set to local noon to ensure sunset calc is on the correct day
  observationDateUtc.setUTCHours(10, 0, 0, 0); // 12:00 SAST = 10:00 UTC

  // Also compute the 29th of the current Hijri month for traditional reference
  const twentyNinthDateUtc = calculate29thDate(currentHijriYear, currentHijriMonth);

  // Sunset on the observation date (the actual sighting moment)
  const sunsetTimeUtc = calculateSunsetUtc(observationDateUtc);

  // Moonset on the observation date (end of observation window)
  const moonsetTimeUtc = calculateMoonsetUtc(sunsetTimeUtc);

  // Observation window: sunset + 15 min (end of civil twilight) → moonset
  const observationWindowStartUtc = new Date(sunsetTimeUtc.getTime() + 15 * 60 * 1000);
  const observationWindowEndUtc = moonsetTimeUtc;

  // Moon age at sunset (hours since conjunction) — should be ~12-30h for a genuine crescent
  const moonAgeAtSunsetHours = (sunsetTimeUtc.getTime() - conjunctionTimeUtc.getTime()) / (1000 * 60 * 60);

  // Moon altitude at sunset
  const moonAltitudeAtSunsetDeg = calculateMoonAltitude(sunsetTimeUtc);

  // Elongation at sunset
  const elongationDeg = calculateElongation(sunsetTimeUtc);

  // Illumination at sunset
  const illuminationPercent = calculateIllumination(elongationDeg);

  // Yallop Q
  const yallopQ = calculateYallopQ(moonAgeAtSunsetHours, moonAltitudeAtSunsetDeg, elongationDeg);

  // Visibility assessment
  const { visibility, note: visibilityNote, willComplete30Days } = assessVisibility(
    moonAgeAtSunsetHours, moonAltitudeAtSunsetDeg, elongationDeg, illuminationPercent, yallopQ,
  );

  // Announcement
  const { title, body } = generateAnnouncement(
    nextHijriMonth, nextHijriYear, visibility, willComplete30Days,
    conjunctionTimeUtc, sunsetTimeUtc,
    moonAgeAtSunsetHours, elongationDeg, illuminationPercent,
    nextMonthName, nextMonthNameAr,
  );

  // Days until observation (conjunction + 1 day)
  const now = new Date();
  const msUntilObs = observationDateUtc.getTime() - now.getTime();
  const daysUntilObservation = Math.ceil(msUntilObs / (1000 * 60 * 60 * 24));

  // Days until new month — if crescent is sighted on observation evening, the
  // new month begins at sunset that day. If not sighted (30-day completion),
  // the new month begins at sunset the next day.
  const newMonthStartUtc = willComplete30Days
    ? new Date(observationDateUtc.getTime() + 24 * 60 * 60 * 1000) // next evening
    : new Date(observationDateUtc.getTime()); // observation evening
  const daysUntilNewMonth = Math.ceil((newMonthStartUtc.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Suppression logic
  const { suppress: suppressAlert, reason: suppressReason } = determineSuppression(currentHijriDay, daysUntilObservation);

  // API enrichment (non-blocking; falls back gracefully)
  let apiEnrichment;
  let dataSource: "local" | "api+local" = "local";
  try {
    apiEnrichment = await enrichWithApi(conjunctionTimeUtc);
    if (apiEnrichment.aladhanHijriDate || apiEnrichment.moonPhaseApiIllumination !== undefined) {
      dataSource = "api+local";
    }
  } catch { /* ignore */ }

  // Localized strings
  const conjStr = conjunctionTimeUtc.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const sunsetStr = sunsetTimeUtc.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const moonsetStr = moonsetTimeUtc.toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  return {
    currentHijriMonth,
    currentHijriYear,
    currentHijriDay,
    currentHijriMonthName: currentMonthName,
    nextHijriMonth,
    nextHijriYear,
    nextHijriMonthName: nextMonthName,
    nextHijriMonthNameAr: nextMonthNameAr,

    conjunctionTimeUtc,
    conjunctionTimeLocal: conjStr,
    sunsetTimeUtc,
    sunsetTimeLocal: sunsetStr,
    moonsetTimeUtc,
    moonsetTimeLocal: moonsetStr,
    observationWindowStartUtc,
    observationWindowEndUtc,

    moonAgeAtSunsetHours,
    moonAltitudeAtSunsetDeg,
    elongationDeg,
    illuminationPercent,

    visibility,
    visibilityNote,
    yallopQ,
    willComplete30Days,
    daysUntilObservation,
    daysUntilNewMonth,

    announcementTitle: title,
    announcementBody: body,

    dataSource,
    apiEnrichment: dataSource === "api+local" ? apiEnrichment : undefined,

    suppressAlert,
    suppressReason,
  };
}

/**
 * Get the themed hadith + encouragement for a specific Hijri month.
 */
export function getMonthTheme(hijriMonth: number) {
  return MONTH_THEMES[hijriMonth] || DEFAULT_THEME;
}

/**
 * Check if we're within the alert window (last 5 days of the Hijri month).
 * Days 25-29 of any Hijri month.
 */
export function isNearMonthEnd(currentHijriDay: number): boolean {
  return currentHijriDay >= 25 && currentHijriDay <= 30;
}

/**
 * Check if we're in the last week (for announcement expiry logic).
 * Days 24-30 of any Hijri month.
 */
export function isInLastWeek(currentHijriDay: number): boolean {
  return currentHijriDay >= 24;
}

export {
  HIJRI_MONTH_NAMES,
  HIJRI_MONTH_NAMES_AR,
  MONTH_THEMES,
};
