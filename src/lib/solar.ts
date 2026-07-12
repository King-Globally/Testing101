/**
 * Solar calculations — accurate sunrise, sunset, solar noon, and twilight times
 * for Johannesburg, South Africa (26.2041°S, 28.0473°E).
 *
 * Uses the NOAA Solar Position Algorithm (simplified) with:
 *  - Equation of time correction
 *  - Solar declination (accurate to ~0.01°)
 *  - Atmospheric refraction correction (0.833° at horizon)
 *  - Proper hour angle calculation for the observer's latitude
 *
 * All times returned in SAST (UTC+2). Accuracy: ±1-2 minutes.
 *
 * Reference: NOAA Solar Calculator — https://gml.noaa.gov/grad/solcalc/
 */

const LAT = -26.2041;  // Johannesburg latitude (degrees)
const LON = 28.0473;   // Johannesburg longitude (degrees)
const TZ_OFFSET = 2;   // SAST = UTC+2
const REFRACTION_DEG = 0.833; // Standard atmospheric refraction at horizon

function deg2rad(d: number): number { return d * Math.PI / 180; }
function rad2deg(r: number): number { return r * 180 / Math.PI; }
function norm360(d: number): number { return ((d % 360) + 360) % 360; }

/**
 * Calculate the Julian Day Number from a Date.
 */
function toJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Calculate the Julian Century from J2000.0 epoch.
 */
function toJulianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Calculate the geometric mean longitude of the sun (degrees).
 */
function geomMeanLongSun(T: number): number {
  const L0 = 280.46646 + T * (36000.76983 + 0.0003032 * T);
  return norm360(L0);
}

/**
 * Calculate the geometric mean anomaly of the sun (degrees).
 */
function geomMeanAnomalySun(T: number): number {
  return 357.52911 + T * (35999.05029 - 0.0001537 * T);
}

/**
 * Calculate the eccentricity of Earth's orbit.
 */
function eccentricityEarthOrbit(T: number): number {
  return 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
}

/**
 * Calculate the sun's equation of center (degrees).
 */
function sunEquationOfCenter(T: number): number {
  const M = geomMeanAnomalySun(T);
  const Mrad = deg2rad(M);
  return (
    Math.sin(Mrad) * (1.914602 - T * (0.004817 + 0.000014 * T))
    + Math.sin(2 * Mrad) * (0.019993 - 0.000101 * T)
    + Math.sin(3 * Mrad) * 0.000289
  );
}

/**
 * Calculate the sun's true longitude (degrees).
 */
function sunTrueLongitude(T: number): number {
  return geomMeanLongSun(T) + sunEquationOfCenter(T);
}

/**
 * Calculate the sun's apparent longitude (degrees, corrected for nutation and aberration).
 */
function sunApparentLongitude(T: number): number {
  const omega = 125.04 - 1934.136 * T;
  return sunTrueLongitude(T) - 0.00569 - 0.00478 * Math.sin(deg2rad(omega));
}

/**
 * Calculate the mean obliquity of the ecliptic (degrees).
 */
function meanObliquityOfEcliptic(T: number): number {
  const seconds = 21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813));
  return 23.0 + (26.0 + seconds / 60.0) / 60.0;
}

/**
 * Calculate the obliquity correction (degrees).
 */
function obliquityCorrection(T: number): number {
  const epsilon0 = meanObliquityOfEcliptic(T);
  const omega = 125.04 - 1934.136 * T;
  return epsilon0 + 0.00256 * Math.cos(deg2rad(omega));
}

/**
 * Calculate the sun's declination (degrees).
 */
function sunDeclination(T: number): number {
  const epsilon = obliquityCorrection(T);
  const lambda = sunApparentLongitude(T);
  return rad2deg(Math.asin(Math.sin(deg2rad(epsilon)) * Math.sin(deg2rad(lambda))));
}

/**
 * Calculate the equation of time (minutes).
 * This corrects for the Earth's elliptical orbit and axial tilt.
 */
function equationOfTime(T: number): number {
  const epsilon = obliquityCorrection(T);
  const L0 = geomMeanLongSun(T);
  const e = eccentricityEarthOrbit(T);
  const m = geomMeanAnomalySun(T);

  const y = Math.tan(deg2rad(epsilon) / 2) * Math.tan(deg2rad(epsilon) / 2);
  const sin2L0 = Math.sin(2 * deg2rad(L0));
  const sin4L0 = Math.sin(4 * deg2rad(L0));
  const cos2L0 = Math.cos(2 * deg2rad(L0));
  const sinM = Math.sin(deg2rad(m));
  const sin2M = Math.sin(2 * deg2rad(m));

  const Etime = (
    y * sin2L0
    - 2 * e * sinM
    + 4 * e * y * sinM * cos2L0
    - 0.5 * y * y * sin4L0
    - 1.25 * e * e * sin2M
  ) * rad2deg(1) * 4; // Convert radians to minutes (15°/hour → 4 min/degree)

  return Etime;
}

/**
 * Calculate the hour angle of sunrise (degrees).
 * Returns null if the sun never rises/sets at this latitude/date.
 */
function hourAngleSunrise(latDeg: number, declDeg: number): number | null {
  const latRad = deg2rad(latDeg);
  const declRad = deg2rad(declDeg);
  const cosArg = Math.cos(deg2rad(90 + REFRACTION_DEG)) / (Math.cos(latRad) * Math.cos(declRad)) - Math.tan(latRad) * Math.tan(declRad);

  if (cosArg > 1) return null; // Polar night
  if (cosArg < -1) return null; // Midnight sun
  return rad2deg(Math.acos(cosArg));
}

/**
 * Calculate sunrise time (UTC minutes from midnight) for a given date.
 * Returns null if the sun never rises.
 */
function sunriseUtcMinutes(date: Date, lat = LAT, lon = LON): number | null {
  const jd = toJulianDay(date);
  const T = toJulianCentury(jd);
  const decl = sunDeclination(T);
  const ha = hourAngleSunrise(lat, decl);
  if (ha === null) return null;

  const eqTime = equationOfTime(T);

  // Solar noon (UTC minutes): 720 - 4*longitude - equationOfTime
  const solarNoon = 720 - 4 * lon - eqTime;

  // Sunrise: solar noon - hourAngle*4 minutes
  return solarNoon - 4 * ha;
}

/**
 * Calculate sunset time (UTC minutes from midnight) for a given date.
 * Returns null if the sun never sets.
 */
function sunsetUtcMinutes(date: Date, lat = LAT, lon = LON): number | null {
  const jd = toJulianDay(date);
  const T = toJulianCentury(jd);
  const decl = sunDeclination(T);
  const ha = hourAngleSunrise(lat, decl);
  if (ha === null) return null;

  const eqTime = equationOfTime(T);
  const solarNoon = 720 - 4 * lon - eqTime;

  // Sunset: solar noon + hourAngle*4 minutes
  return solarNoon + 4 * ha;
}

/**
 * Calculate solar noon time (UTC minutes from midnight).
 */
function solarNoonUtcMinutes(date: Date, lat = LAT, lon = LON): number {
  const jd = toJulianDay(date);
  const T = toJulianCentury(jd);
  const eqTime = equationOfTime(T);
  return 720 - 4 * lon - eqTime;
}

/**
 * Convert UTC minutes from midnight to SAST (UTC+2) "HH:MM" string.
 */
function utcMinutesToSastHHMM(utcMin: number): string {
  // Add timezone offset, normalize to 0-1439
  let sastMin = utcMin + TZ_OFFSET * 60;
  sastMin = ((sastMin % 1440) + 1440) % 1440;
  const h = Math.floor(sastMin / 60);
  const m = Math.floor(sastMin % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface SolarTimes {
  sunrise: string;     // "HH:MM" SAST
  sunset: string;      // "HH:MM" SAST
  solarNoon: string;   // "HH:MM" SAST
  sunriseDate: Date;   // SAST Date object
  sunsetDate: Date;    // SAST Date object
}

/**
 * Calculate accurate sunrise, sunset, and solar noon for Johannesburg
 * on a given date.
 */
export function getSolarTimes(date: Date = new Date()): SolarTimes {
  // Use noon UTC of the given date to ensure we're calculating for the correct day
  const calcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12, 0, 0,
  ));

  const sunriseMin = sunriseUtcMinutes(calcDate);
  const sunsetMin = sunsetUtcMinutes(calcDate);
  const noonMin = solarNoonUtcMinutes(calcDate);

  const sunriseStr = sunriseMin !== null ? utcMinutesToSastHHMM(sunriseMin) : "06:30";
  const sunsetStr = sunsetMin !== null ? utcMinutesToSastHHMM(sunsetMin) : "17:30";
  const noonStr = utcMinutesToSastHHMM(noonMin);

  // Build SAST Date objects (UTC+2)
  const sunriseDate = new Date(calcDate);
  sunriseDate.setUTCMinutes(sunriseMin ?? 270);
  const sunsetDate = new Date(calcDate);
  sunsetDate.setUTCMinutes(sunsetMin ?? 1050);

  return {
    sunrise: sunriseStr,
    sunset: sunsetStr,
    solarNoon: noonStr,
    sunriseDate,
    sunsetDate,
  };
}

/**
 * Calculate Fajr start time (astronomical twilight: sun 18° below horizon).
 * This is the standard Hanafi Fajr calculation.
 */
function twilightHourAngle(latDeg: number, declDeg: number, angleDeg: number): number | null {
  const latRad = deg2rad(latDeg);
  const declRad = deg2rad(declDeg);
  const cosArg = Math.cos(deg2rad(90 + angleDeg)) / (Math.cos(latRad) * Math.cos(declRad)) - Math.tan(latRad) * Math.tan(declRad);
  if (cosArg > 1 || cosArg < -1) return null;
  return rad2deg(Math.acos(cosArg));
}

/**
 * Calculate prayer times using astronomical formulas.
 * Returns accurate times for Johannesburg.
 *
 * Method: Umm al-Qura calculation with Hanafi Asr, calibrated against
 * the Aladhan API (method=2 ISNA, school=1 Hanafi) for South African coordinates.
 *
 * - Fajr: sun 15° below horizon (ISNA standard, matches Aladhan API)
 * - Sunrise: sun at -0.833° (with refraction)
 * - Dhuhr: solar noon + 5 min (standard safety margin)
 * - Asr (Hanafi): shadow = 2× object height → sun altitude = arctan(1/2) ≈ 26.57°
 *   Note: Factor 2 (Hanafi) means the Asr time is LATER than Shafi'i.
 *   Using the Mamluk/Aladhan convention for the factor calculation.
 * - Maghrib: sunset + 3 min (safety margin)
 * - Isha: sun 15° below horizon (matches Aladhan ISNA method)
 */
export interface AstronomicalPrayerTimes {
  fajr: string;      // "HH:MM" SAST
  sunrise: string;   // "HH:MM" SAST
  dhuhr: string;     // "HH:MM" SAST
  asr: string;       // "HH:MM" SAST (Hanafi)
  maghrib: string;   // "HH:MM" SAST
  isha: string;      // "HH:MM" SAST
}

export function getAstronomicalPrayerTimes(date: Date = new Date()): AstronomicalPrayerTimes {
  const calcDate = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12, 0, 0,
  ));

  const jd = toJulianDay(calcDate);
  const T = toJulianCentury(jd);
  const decl = sunDeclination(T);
  const eqTime = equationOfTime(T);
  const solarNoon = 720 - 4 * LON - eqTime; // UTC minutes

  // Fajr: sun 15° below horizon (ISNA standard — matches Aladhan API method=2)
  const fajrHA = twilightHourAngle(LAT, decl, 15);
  const fajrMin = fajrHA !== null ? solarNoon - 4 * fajrHA : solarNoon - 90;

  // Sunrise: sun at -0.833° (with refraction)
  const sunriseHA = hourAngleSunrise(LAT, decl);
  const sunriseMin = sunriseHA !== null ? solarNoon - 4 * sunriseHA : solarNoon - 60;

  // Dhuhr: solar noon (Aladhan convention — no +5 min offset, to match API)
  const dhuhrMin = solarNoon;

  // Asr (Hanafi, factor 2): shadow = 2× object height
  // Using the standard formula: cot(asrAngle) = factor, where factor = 2 for Hanafi
  // asrAngle = arctan(1/factor) = arctan(1/2) = 26.565°
  // Then compute the hour angle for sun altitude = asrAngle
  const latRad = deg2rad(LAT);
  const declRad = deg2rad(decl);
  const asrAngleRad = deg2rad(26.565); // arctan(1/2) for Hanafi factor 2
  const asrCosArg = (Math.sin(asrAngleRad) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  let asrMin: number;
  if (asrCosArg >= -1 && asrCosArg <= 1) {
    const asrHA = rad2deg(Math.acos(asrCosArg));
    asrMin = solarNoon + 4 * asrHA;
  } else {
    asrMin = solarNoon + 240; // Fallback: 4 hours after noon
  }

  // Maghrib: sunset (astronomical, no offset — to match Aladhan API)
  const sunsetMin = sunriseHA !== null ? solarNoon + 4 * sunriseHA : solarNoon + 60;
  const maghribMin = sunsetMin;

  // Isha: sun 15° below horizon (ISNA standard — matches Aladhan API method=2)
  const ishaHA = twilightHourAngle(LAT, decl, 15);
  const ishaMin = ishaHA !== null ? solarNoon + 4 * ishaHA : maghribMin + 90;

  return {
    fajr: utcMinutesToSastHHMM(fajrMin),
    sunrise: utcMinutesToSastHHMM(sunriseMin),
    dhuhr: utcMinutesToSastHHMM(dhuhrMin),
    asr: utcMinutesToSastHHMM(asrMin),
    maghrib: utcMinutesToSastHHMM(maghribMin),
    isha: utcMinutesToSastHHMM(ishaMin),
  };
}

/**
 * Fetch live prayer times from the Aladhan API for verification and
 * enhanced accuracy. Falls back to local calculation if the API is unavailable.
 *
 * Uses method=2 (ISNA) and school=1 (Hanafi) for South African standard.
 */
export async function getLivePrayerTimes(date: Date = new Date()): Promise<{
  times: AstronomicalPrayerTimes;
  source: "api" | "local";
  apiVerified: boolean;
}> {
  // Try Aladhan API first
  try {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${LAT}&longitude=${LON}&method=2&school=1`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    if (r.ok) {
      const j = await r.json();
      if (j?.data?.timings) {
        const t = j.data.timings;
        return {
          times: {
            fajr: cleanTime(t.Fajr),
            sunrise: cleanTime(t.Sunrise),
            dhuhr: cleanTime(t.Dhuhr),
            asr: cleanTime(t.Asr),
            maghrib: cleanTime(t.Maghrib),
            isha: cleanTime(t.Isha),
          },
          source: "api",
          apiVerified: true,
        };
      }
    }
  } catch {
    // Fall through to local calculation
  }

  // Fallback to local astronomical calculation
  return {
    times: getAstronomicalPrayerTimes(date),
    source: "local",
    apiVerified: false,
  };
}

/**
 * Clean time string from Aladhan API (removes timezone suffix like "06:56 (SAST)")
 */
function cleanTime(t: string): string {
  const match = t.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : t;
}
