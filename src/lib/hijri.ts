// Hijri date utilities — South African moon-sighting calendar with
// night-precedes-day (Maghrib) intelligence.
//
// Two critical Islamic chronological principles are implemented here:
//
// 1. SOUTH AFRICAN SIGHTING CALENDAR:
//    The Jamiatul Ulama South Africa Central Hilaal Committee confirms moon
//    sightings locally. The SA calendar is currently 1 day behind the Umm
//    al-Qura calendar (Aladhan API). For example:
//      Umm al-Qura: 1 Muḥarram 1448 = 16 June 2026 (Tuesday)
//      SA sighting: 1 Muḥarram 1448 = 17 June 2026 (Wednesday) ← confirmed
//    This means for any Gregorian date, the SA Hijri date is 1 day behind
//    the Umm al-Qura Hijri date.
//
// 2. NIGHT PRECEDES DAY (الليل يسبق النهار):
//    In Islam, the day begins at Maghrib (sunset), not at midnight.
//    The Islamic "day" of date N spans from Maghrib of Gregorian day (N-1)
//    to Maghrib of Gregorian day N.
//    Example: 25 Muḥarram 1448 (SA) = Maghrib 10 July → Maghrib 11 July
//    So during the daytime of 11 July (before Maghrib), it's still 25 Muḥarram.
//    At Maghrib 11 July, 26 Muḥarram begins.
//
// Combined logic for getCurrentIslamicDate(now):
//   - Base SA Hijri = Umm al-Qura Hijri for (now - 1 day) [SA offset]
//   - If now >= Maghrib today → advance by 1 day [night-precedes-day]
//   - Result: the correct Islamic date at the current moment

const HIJRI_MONTHS_LATIN = [
  "Muḥarram", "Ṣafar", "Rabī' al-Awwal", "Rabī' al-Ākhir",
  "Jumādā al-Ūlā", "Jumādā al-Ākhirah", "Rajab", "Sha'bān",
  "Ramaḍān", "Shawwāl", "Dhul-Qa'dah", "Dhul-Ḥijjah",
];

const HIJRI_MONTHS_ARABIC = [
  "مُحَرَّم", "صَفَر", "رَبِيع الأَوَّل", "رَبِيع الآخِر",
  "جُمَادَى الأُولَى", "جُمَادَى الآخِرَة", "رَجَب", "شَعْبَان",
  "رَمَضَان", "شَوَّال", "ذُو الْقَعْدَة", "ذُو الْحِجَّة",
];

const HIJRI_DAYS_ARABIC = [
  "الأحد", "الإثنين", "الثلاثاء", "الأربعاء",
  "الخميس", "الجمعة", "السبت",
];

// South African sighting offset: SA calendar is 1 day behind Umm al-Qura.
// This means: SA Hijri date for Gregorian date X = Umm al-Qura Hijri for (X - 1 day).
// Verified: SA says 1 Muḥarram 1448 = 17 June 2026; Umm al-Qura says 16 June.
// So SA Hijri(17 June) = Umm al-Qura Hijri(16 June) = 1 Muḥarram. ✓
const SA_SIGHTING_OFFSET_DAYS = -1;

// Johannesburg coordinates for sunset calculation
const JOHANNESBURG_LAT = -26.2041;
const JOHANNESBURG_LON = 28.0473;
const SAST_OFFSET = 2; // UTC+2

// Convert Gregorian Date → Julian Day Number (integer)
function gregorianToJD(year: number, month: number, day: number): number {
  if (month < 3) {
    year -= 1;
    month += 12;
  }
  const a = Math.floor(year / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (year + 4716)) +
         Math.floor(30.6001 * (month + 1)) +
         day + b - 1524;
}

// Convert Julian Day Number → Hijri (year, month, day) — Kuwaiti algorithm
function jdToHijri(jd: number): { year: number; month: number; day: number } {
  jd = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (jd - 1948439.5) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + hijriToJD(year, 1, 1))) / 29.5) + 1);
  const day = jd - hijriToJD(year, month, 1) + 1;
  return { year, month, day: Math.floor(day) };
}

function hijriToJD(year: number, month: number, day: number): number {
  return (
    day +
    Math.ceil(29.5 * (month - 1)) +
    (year - 1) * 354 +
    Math.floor((3 + 11 * year) / 30) +
    1948439.5 -
    1
  );
}

export interface HijriDate {
  year: number;     // 1448 etc.
  month: number;    // 1..12
  day: number;      // 1..30
  monthLatin: string;
  monthArabic: string;
  weekdayArabic: string;
  formattedLatin: string;  // e.g. "25 Muḥarram 1448"
  formattedArabic: string; // e.g. "٢٥ مُحَرَّم ١٤٤٨"
}

/**
 * Convert Gregorian → Hijri using the Umm al-Qura (Kuwaiti) algorithm.
 * This matches the Aladhan API output.
 * NOTE: This does NOT apply the SA sighting offset or the Maghrib rule.
 * For the current Islamic date, use getCurrentIslamicDate() instead.
 */
export function gregorianToHijri(date: Date): HijriDate {
  const jd = gregorianToJD(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const h = jdToHijri(jd);
  const idx = h.month - 1;
  return {
    ...h,
    monthLatin: HIJRI_MONTHS_LATIN[idx],
    monthArabic: HIJRI_MONTHS_ARABIC[idx],
    weekdayArabic: HIJRI_DAYS_ARABIC[date.getDay()],
    formattedLatin: `${h.day} ${HIJRI_MONTHS_LATIN[idx]} ${h.year} AH`,
    formattedArabic: `${toArabicDigits(h.day)} ${HIJRI_MONTHS_ARABIC[idx]} ${toArabicDigits(h.year)}`,
  };
}

/**
 * Convert Hijri → Gregorian using the Umm al-Qura (Kuwaiti) algorithm,
 * with consistency-correction search for perfect round-trip accuracy.
 *
 * NOTE: This returns the Umm al-Qura Gregorian date. For the South African
 * sighting calendar, use hijriToGregorianSA() instead, which applies the
 * +1 day offset.
 */
export function hijriToGregorian(year: number, month: number, day: number): Date {
  // Step 1: Get approximate Gregorian date using the Kuwaiti algorithm
  const jd = hijriToJD(year, month, day);
  const z = Math.floor(jd + 0.5);
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);
  const dayGreg = c - e - Math.floor(30.6001 * f);
  const monthGreg = f < 14 ? f - 1 : f - 13;
  const yearGreg = monthGreg > 2 ? d - 4716 : d - 4715;
  const approx = new Date(yearGreg, monthGreg - 1, dayGreg);

  // Step 2: Search ±3 days to find the exact Gregorian date where
  // gregorianToHijri matches the target (year, month, day).
  for (let offset = -3; offset <= 3; offset++) {
    const candidate = new Date(approx);
    candidate.setDate(candidate.getDate() + offset);
    const h = jdToHijri(gregorianToJD(candidate.getFullYear(), candidate.getMonth() + 1, candidate.getDate()));
    if (h.year === year && h.month === month && h.day === day) {
      return candidate;
    }
  }

  return approx;
}

/**
 * Convert Hijri → Gregorian using the SOUTH AFRICAN sighting calendar.
 * The SA calendar is 1 day behind Umm al-Qura, so we add 1 day to the
 * Umm al-Qura result.
 *
 * Example: hijriToGregorianSA(1448, 1, 1) = 17 June 2026 (Wednesday)
 *          hijriToGregorian(1448, 1, 1)    = 16 June 2026 (Tuesday) [Umm al-Qura]
 */
export function hijriToGregorianSA(year: number, month: number, day: number): Date {
  const ummAlQuraDate = hijriToGregorian(year, month, day);
  const saDate = new Date(ummAlQuraDate);
  saDate.setDate(saDate.getDate() + 1); // SA is 1 day behind Umm al-Qura
  return saDate;
}

/**
 * Convert Gregorian → Hijri using the SOUTH AFRICAN sighting calendar.
 * SA Hijri for Gregorian date X = Umm al-Qura Hijri for (X - 1 day).
 *
 * Example: gregorianToHijriSA(11 July 2026) = 25 Muḥarram 1448
 *          gregorianToHijri(11 July 2026)    = 26 Muḥarram 1448 [Umm al-Qura]
 */
export function gregorianToHijriSA(date: Date): HijriDate {
  const shiftedDate = new Date(date);
  shiftedDate.setDate(shiftedDate.getDate() + SA_SIGHTING_OFFSET_DAYS); // -1 day
  const h = gregorianToHijri(shiftedDate);
  return h;
}

// ─── Sunset (Maghrib) calculation for Johannesburg ──────────────────────────

function deg2rad(d: number): number { return d * Math.PI / 180; }
function rad2deg(r: number): number { return r * 180 / Math.PI; }
function norm360(d: number): number { return ((d % 360) + 360) % 360; }

/**
 * Calculate sunset time (as a Date) for Johannesburg on a given date.
 * Uses the NOAA solar position algorithm (simplified).
 * Returns the sunset time in local time (SAST).
 */
function calculateSunset(date: Date): Date {
  const doy = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
  const gamma = 2 * Math.PI / 365 * (doy - 1);

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

  const latRad = deg2rad(JOHANNESBURG_LAT);
  const declRad = decl;
  const cosHourAngle = (Math.cos(deg2rad(90.833)) - Math.sin(latRad) * Math.sin(declRad))
    / (Math.cos(latRad) * Math.cos(declRad));

  if (cosHourAngle > 1 || cosHourAngle < -1) {
    // Polar conditions — fallback to 17:30
    const sunset = new Date(date);
    sunset.setHours(17, 30, 0, 0);
    return sunset;
  }

  const hourAngle = rad2deg(Math.acos(cosHourAngle));
  const solarNoonUtcMin = 720 - 4 * JOHANNESBURG_LON - eqTime;
  const sunsetUtcMin = solarNoonUtcMin + 4 * hourAngle;

  // Convert UTC minutes to SAST (UTC+2)
  const sastMin = ((sunsetUtcMin + SAST_OFFSET * 60) % 1440 + 1440) % 1440;
  const sunset = new Date(date);
  sunset.setHours(Math.floor(sastMin / 60), Math.floor(sastMin % 60), 0, 0);
  return sunset;
}

/**
 * Get the current Islamic date applying BOTH:
 *   1. South African sighting offset (SA calendar is 1 day behind Umm al-Qura)
 *   2. Night-precedes-day rule (Islamic day starts at Maghrib/sunset)
 *
 * Logic:
 *   - Calculate the SA Hijri date for today's Gregorian daytime
 *     (= Umm al-Qura Hijri for yesterday)
 *   - If current time >= today's Maghrib (sunset), the Islamic day has
 *     advanced → add 1 day to the SA Hijri date
 *   - If current time < Maghrib, keep the SA Hijri date as-is
 *
 * Example (11 July 2026, morning, before Maghrib):
 *   - SA Hijri for 11 July = Umm al-Qura for 10 July = 25 Muḥarram
 *   - Before Maghrib → no advancement
 *   - Result: 25 Muḥarram 1448 ✓
 *
 * Example (11 July 2026, evening, after Maghrib ~17:31):
 *   - SA Hijri for 11 July = 25 Muḥarram
 *   - After Maghrib → advance by 1 day → 26 Muḥarram
 *   - Result: 26 Muḥarram 1448 (the new Islamic day has begun)
 */
export function getCurrentIslamicDate(now: Date = new Date()): HijriDate {
  // Step 1: Get the SA Hijri date for today's Gregorian date
  // SA Hijri(X) = Umm al-Qura Hijri(X - 1 day)
  const saHijri = gregorianToHijriSA(now);

  // Step 2: Calculate today's Maghrib (sunset) time in Johannesburg
  const maghribToday = calculateSunset(now);

  // Step 3: If current time >= Maghrib, the Islamic day has advanced
  // The night-precedes-day rule: at Maghrib, the NEXT Islamic day begins
  if (now >= maghribToday) {
    // Advance by 1 day: convert SA Hijri to Gregorian, add 1 day, convert back
    const saGreg = hijriToGregorianSA(saHijri.year, saHijri.month, saHijri.day);
    saGreg.setDate(saGreg.getDate() + 1);
    const advancedHijri = gregorianToHijri(saGreg);
    // But gregorianToHijri is Umm al-Qura... we need to convert back to SA
    // Actually, after Maghrib, the Islamic date is the SA Hijri date for TOMORROW
    // SA Hijri(tomorrow) = Umm al-Qura Hijri(tomorrow - 1) = Umm al-Qura Hijri(today)
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const saHijriTomorrow = gregorianToHijriSA(tomorrow);
    return formatHijri(saHijriTomorrow, now.getDay());
  }

  // Step 4: Before Maghrib → use today's SA Hijri date
  return formatHijri(saHijri, now.getDay());
}

/**
 * Format a Hijri date object with all display fields.
 */
function formatHijri(h: { year: number; month: number; day: number }, weekday: number): HijriDate {
  const idx = h.month - 1;
  return {
    ...h,
    monthLatin: HIJRI_MONTHS_LATIN[idx],
    monthArabic: HIJRI_MONTHS_ARABIC[idx],
    weekdayArabic: HIJRI_DAYS_ARABIC[weekday],
    formattedLatin: `${h.day} ${HIJRI_MONTHS_LATIN[idx]} ${h.year} AH`,
    formattedArabic: `${toArabicDigits(h.day)} ${HIJRI_MONTHS_ARABIC[idx]} ${toArabicDigits(h.year)}`,
  };
}

// Convert Western digits → Arabic-Indic digits for display
export function toArabicDigits(n: number | string): string {
  const map = ["٠","١","٢","٣","٤","٥","٦","٧","٨","٩"];
  return String(n).replace(/[0-9]/g, d => map[+d]);
}

export { HIJRI_MONTHS_LATIN, HIJRI_MONTHS_ARABIC, SA_SIGHTING_OFFSET_DAYS };
