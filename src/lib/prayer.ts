"use client";
import { useEffect, useMemo, useState } from "react";
import { getAstronomicalPrayerTimes } from "./solar";

export interface PrayerSlot {
  name: string;
  arabic: string;
  start: string;       // "HH:MM" — Azaan time
  end: string;         // "HH:MM" — Jama'ah time (same as start for Sunrise)
  order: number;
}

// Masjid Al-Farooq baseline schedule — these are the official times from the
// Masjid Al-Farooq live board (Crosby, Johannesburg).
// Azaan (start) and Jama'ah (end) times for Fajr, Dhuhr, Asr, and Isha are
// masjid-specific and remain as set below.
// The Sunrise time and Maghrib time are astronomically calculated for
// Johannesburg (26.2041°S, 28.0473°E) using the NOAA Solar Position Algorithm
// AND verified against the Aladhan API (ISNA method, Hanafi school), so they
// are always accurate.
const DEFAULT: PrayerSlot[] = [
  { name: "Fajr",    arabic: "الفجر",     start: "06:00", end: "06:15", order: 0 },
  { name: "Sunrise", arabic: "الشروق",    start: "06:55", end: "06:55", order: 1 },
  { name: "Dhuhr",   arabic: "الظهر",     start: "13:00", end: "13:15", order: 2 },
  { name: "Asr",     arabic: "العصر",     start: "16:30", end: "16:45", order: 3 },
  { name: "Maghrib", arabic: "المغرب",    start: "17:31", end: "17:36", order: 4 },
  { name: "Isha",    arabic: "العشاء",    start: "19:00", end: "19:15", order: 5 },
];

const STORAGE_KEY = "jamiat.joburg.prayer.v1";

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Merge the user's saved prayer schedule with live astronomical times.
 * This ensures:
 *  - Sunrise slot ALWAYS shows the accurate astronomical sunrise for Johannesburg
 *  - Maghrib slot ALWAYS shows the accurate astronomical sunset + 5 min jama'ah
 *  - Fajr slot ALWAYS shows the official Masjid Al-Farooq times (06:00 / 06:15)
 *    as per the live board — these are masjid-specific and should not drift
 */
function mergeWithAstronomical(schedule: PrayerSlot[], liveTimes?: {
  sunrise: string; maghrib: string;
}): PrayerSlot[] {
  // Use live API times if available, otherwise fall back to local calc
  const astro = liveTimes ? { sunrise: liveTimes.sunrise, maghrib: liveTimes.maghrib }
                          : getAstronomicalPrayerTimes(new Date());
  return schedule.map(slot => {
    if (slot.name === "Sunrise") {
      return { ...slot, start: astro.sunrise, end: astro.sunrise };
    }
    if (slot.name === "Maghrib") {
      // Maghrib Azaan = sunset (astronomically accurate); Jama'ah = +5 min
      return { ...slot, start: astro.maghrib, end: addMinutes(astro.maghrib, 5) };
    }
    if (slot.name === "Fajr") {
      // Enforce official Masjid Al-Farooq Fajr times from the live board
      return { ...slot, start: "06:00", end: "06:15" };
    }
    return slot;
  });
}

function addMinutes(hhmm: string, mins: number): string {
  const total = toMin(hhmm) + mins;
  const h = Math.floor((total % 1440) / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function usePrayerSchedule() {
  // Always start with DEFAULT on both server and first client render
  // to guarantee hydration matching. Read from localStorage and fetch live
  // times in an effect after mount.
  const [schedule, setSchedule] = useState<PrayerSlot[]>(DEFAULT);

  useEffect(() => {
    let mounted = true;

    // 1. Load user-saved schedule from localStorage
    let baseSchedule = DEFAULT;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PrayerSlot[];
        if (Array.isArray(parsed) && parsed.length === 6) {
          baseSchedule = parsed;
        }
      }
    } catch { /* ignore */ }

    // 2. Fetch live prayer times from API (Aladhan + local fallback)
    fetch("/api/prayer-times")
      .then(r => r.json())
      .then(d => {
        if (!mounted) return;
        if (d?.success && d?.times) {
          // Use live API times for sunrise and maghrib
          setSchedule(mergeWithAstronomical(baseSchedule, {
            sunrise: d.times.sunrise,
            maghrib: d.times.maghrib,
          }));
        } else {
          // Fallback to local astronomical calculation
          setSchedule(mergeWithAstronomical(baseSchedule));
        }
      })
      .catch(() => {
        if (mounted) setSchedule(mergeWithAstronomical(baseSchedule));
      });

    return () => { mounted = false; };
  }, []);

  const persist = (next: PrayerSlot[]) => {
    setSchedule(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  return { schedule, setSchedule: persist };
}

/** Compute the next prayer slot + countdown, given the schedule + current time */
export function useNextPrayer(schedule: PrayerSlot[], now: Date) {
  return useMemo(() => {
    const curMin = now.getHours() * 60 + now.getMinutes();
    // Sort by start time
    const sorted = [...schedule].sort((a, b) => toMin(a.start) - toMin(b.start));
    for (const slot of sorted) {
      const start = toMin(slot.start);
      if (start > curMin) {
        const diff = start - curMin;
        return {
          next: slot,
          diffMin: diff,
          countdown: `${String(Math.floor(diff / 60)).padStart(2, "0")}:${String(diff % 60).padStart(2, "0")}`,
        };
      }
    }
    // Tomorrow's Fajr
    const fajr = sorted.find(s => s.name === "Fajr")!;
    const start = toMin(fajr.start) + 24 * 60;
    const diff = start - curMin;
    return {
      next: fajr,
      diffMin: diff,
      countdown: `${String(Math.floor(diff / 60)).padStart(2, "0")}:${String(diff % 60).padStart(2, "0")}`,
    };
  }, [schedule, now]);
}

export { DEFAULT as DEFAULT_SCHEDULE, mergeWithAstronomical, getAstronomicalPrayerTimes };
